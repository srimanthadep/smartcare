import os from 'os';
import { dbService } from '../../core/db/db.service.js';
import { getQueueStats } from '../../shared/queue/jobQueue.service.js';

// ── System Health ─────────────────────────────────────────────────────────────
export const getHealth = async (req, res, next) => {
  try {
    // Database health
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    try {
      const start = Date.now();
      await dbService.query('SELECT 1');
      dbResponseTime = Date.now() - start;
    } catch {
      dbStatus = 'unhealthy';
    }

    // Pool stats (not directly accessible, provide defaults)
    const poolStats = {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
    };

    // System stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Process stats
    const processMemory = process.memoryUsage();
    const uptime = process.uptime();

    // Queue stats
    const queueStats = getQueueStats();

    res.json({
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        responseTimeMs: dbResponseTime,
        pool: poolStats,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: {
          '1m': loadAvg[0]?.toFixed(2),
          '5m': loadAvg[1]?.toFixed(2),
          '15m': loadAvg[2]?.toFixed(2),
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: ((usedMem / totalMem) * 100).toFixed(1),
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown',
        },
      },
      process: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        memory: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
        },
        pid: process.pid,
        nodeVersion: process.version,
      },
      queue: queueStats,
    });
  } catch (error) {
    next(error);
  }
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
