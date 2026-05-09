import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './src/config/env.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/error.js';
import { initBackupService } from './src/services/backupService.js';
import { dbService } from './src/services/db.service.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

initBackupService();

app.listen(config.PORT, () => {
  console.log(`🚀 Siara Dental SaaS Backend running in ${config.NODE_ENV} mode`);
  console.log(`🔗 API Endpoint: http://localhost:${config.PORT}/api`);
});

// Keep the process alive
setInterval(() => {}, 1000 * 60 * 60);
