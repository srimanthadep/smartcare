import os from 'os';
import { dbService } from '../../core/db/db.service.js';
import { getQueueStats } from '../../shared/queue/jobQueue.service.js';

// ── System Health ─────────────────────────────────────────────────────────────
export const getHealth = async (req, res, next) => {
  try {
    // Database health check
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

    // Supabase DB stats
    let supabaseStats = {
      status: dbStatus,
      databaseSize: 'N/A',
      activeConnections: 0,
      tables: {
        patients: 0,
        invoices: 0,
        appointments: 0,
        prescriptions: 0,
        auditLogs: 0
      }
    };

    try {
      // 1. Get database size
      const sizeRes = await dbService.query("SELECT pg_size_pretty(pg_database_size(current_database())) as db_size");
      supabaseStats.databaseSize = sizeRes.rows[0]?.db_size || 'N/A';

      // 2. Get active connections
      const connRes = await dbService.query("SELECT count(*) as active_conns FROM pg_stat_activity");
      supabaseStats.activeConnections = parseInt(connRes.rows[0]?.active_conns || 0);

      // 3. Get table counts
      const countsRes = await dbService.query(`
        SELECT 
          (SELECT count(*) FROM patients) as patients_count,
          (SELECT count(*) FROM invoices) as invoices_count,
          (SELECT count(*) FROM appointments) as appointments_count,
          (SELECT count(*) FROM prescriptions) as prescriptions_count,
          (SELECT count(*) FROM audit_logs) as audit_logs_count
      `);
      const counts = countsRes.rows[0] || {};
      supabaseStats.tables = {
        patients: parseInt(counts.patients_count || 0),
        invoices: parseInt(counts.invoices_count || 0),
        appointments: parseInt(counts.appointments_count || 0),
        prescriptions: parseInt(counts.prescriptions_count || 0),
        auditLogs: parseInt(counts.audit_logs_count || 0)
      };
    } catch (err) {
      console.error('Error fetching Supabase stats:', err);
      supabaseStats.status = 'degraded';
    }

    // Render Stats
    const isRender = !!process.env.RENDER;
    const processMemory = process.memoryUsage();
    // Render free tier provides 512MB RAM
    const memoryLimit = 512 * 1024 * 1024;
    const renderStats = {
      isRender,
      serviceName: process.env.RENDER_SERVICE_NAME || 'smartcare-backend',
      serviceId: process.env.RENDER_SERVICE_ID || 'srv-ck9c0d12e3f4',
      instanceId: process.env.RENDER_INSTANCE_ID || 'srv-ck9c0d12e3f4-5f6g7h',
      externalUrl: process.env.RENDER_EXTERNAL_URL || 'https://smartcare-backend.onrender.com',
      region: process.env.RENDER_REGION || 'Singapore (sgp)',
      memoryLimitBytes: memoryLimit,
      memoryUsageBytes: processMemory.rss,
      memoryUsagePercent: ((processMemory.rss / memoryLimit) * 100).toFixed(1)
    };

    // System stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Uptime
    const uptime = process.uptime();

    // Queue stats
    const queueStats = getQueueStats();

    res.json({
      status: dbStatus === 'healthy' && supabaseStats.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        responseTimeMs: dbResponseTime,
        pool: poolStats,
      },
      supabase: supabaseStats,
      render: renderStats,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: {
          '1m': loadAvg[0]?.toFixed(2) || '0.00',
          '5m': loadAvg[1]?.toFixed(2) || '0.00',
          '15m': loadAvg[2]?.toFixed(2) || '0.00',
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
