import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './src/config/env.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/error.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Standard Middlewares
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`🚀 Siara Dental SaaS Backend running in ${config.NODE_ENV} mode`);
  console.log(`🔗 API Endpoint: http://localhost:${config.PORT}/api`);
});
