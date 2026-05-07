import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && config.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
