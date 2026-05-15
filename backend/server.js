import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './src/config/env.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/error.js';
import { initBackupService } from './src/services/backupService.js';
import { dbService } from './src/services/db.service.js';
import { initSocket } from './src/services/socket.service.js';
import { runMigrations } from './src/services/migrationService.js';
import { verifyRedisConnection, closeRedisConnection } from './src/config/redis.js';
import { initQueues } from './src/queues/index.js';
import { startWorkers, stopWorkers } from './src/workers/index.js';

import rateLimit from 'express-rate-limit';

const app = express();
const server = createServer(app);
initSocket(server);

// Essential for Render/Vercel to correctly handle IP-based rate limiting
app.set('trust proxy', 1);

// Security Middlewares
// Global: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, slow down.' },
});
app.use('/api', globalLimiter);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", ...config.CORS_ORIGINS],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition']
}));

// Standard Middlewares
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health Check & Ping Routes
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    message: 'Siara Dental API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    // This query keeps Supabase active by performing a real DB operation
    await dbService.query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Server Startup — DB → Redis → Queues → Workers → Listen
// ─────────────────────────────────────────────────────────────────────────────
const startServer = async () => {
  // 1. Database connection with retry
  let retries = 5;
  while (retries--) {
    try {
      await dbService.query('SELECT 1');
      console.log('✅ Database connection verified');
      await runMigrations();
      initBackupService();
      break;
    } catch (e) {
      if (!retries) {
        console.error('❌ Could not connect to database after retries. Exiting.', e.message);
        process.exit(1);
      }
      console.warn(`⚠️ DB connection failed, retrying in 3s... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // 2. Redis + BullMQ initialization (non-fatal if unavailable)
  const redisOk = await verifyRedisConnection();
  if (redisOk) {
    await initQueues();
    startWorkers();
  }

  // 3. Start HTTP server
  server.listen(config.PORT, () => {
    console.log(`🚀 Siara Dental SaaS Backend running in ${config.NODE_ENV} mode`);
    console.log(`🔗 API Endpoint: http://localhost:${config.PORT}/api`);
    if (redisOk) {
      console.log(`📊 Queue Dashboard: http://localhost:${config.PORT}/api/admin/queues`);
    }
    console.log(`🛡️  Allowed CORS Origins: ${config.CORS_ORIGINS.join(', ')}`);
  });
};

startServer();

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown — Stop workers → close Redis → close HTTP server
// ─────────────────────────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    await stopWorkers();
    await closeRedisConnection();
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('⚠️  Forced exit after 10s timeout');
      process.exit(1);
    }, 10000);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

