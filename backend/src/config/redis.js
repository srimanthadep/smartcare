// ─────────────────────────────────────────────────────────────────────────────
// Redis Connection Factory — Centralized ioredis connection for BullMQ
// Uses Upstash Redis (TLS) for production-grade managed Redis.
// ─────────────────────────────────────────────────────────────────────────────
import IORedis from 'ioredis';
import { config } from './env.js';

let connection = null;

/**
 * Returns a shared ioredis connection configured for Upstash.
 * BullMQ best practice: reuse a single connection instance across all queues.
 * The connection uses `maxRetriesPerRequest: null` as required by BullMQ.
 */
export const getRedisConnection = () => {
  if (connection) return connection;

  if (!config.REDIS_URL) {
    console.warn('⚠️  REDIS_URL not configured — BullMQ queues will be disabled');
    return null;
  }

  connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,   // Required by BullMQ — it manages retries internally
    enableReadyCheck: false,      // Upstash doesn't support CLUSTER INFO
    tls: config.REDIS_URL.startsWith('rediss://') ? {} : undefined,
    lazyConnect: true,            // Don't connect until first command
  });

  connection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  return connection;
};

/**
 * Verifies Redis is reachable. Called once during server startup.
 */
export const verifyRedisConnection = async () => {
  const conn = getRedisConnection();
  if (!conn) return false;

  try {
    // Force a timeout for the initial connection check
    const connectionPromise = conn.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    await conn.ping();
    console.log('✅ Redis (Upstash) connected');
    return true;
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    console.warn('⚠️  Background job queues will be unavailable');
    
    // If it failed, we should probably disconnect to stop ioredis from retrying internally
    try {
      await conn.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    
    return false;
  }
};

/**
 * Gracefully close the Redis connection on shutdown.
 */
export const closeRedisConnection = async () => {
  if (connection) {
    await connection.quit();
    connection = null;
    console.log('🔌 Redis connection closed');
  }
};
