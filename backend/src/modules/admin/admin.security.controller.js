import { dbService } from '../../core/db/db.service.js';

// ── Failed Login Attempts ─────────────────────────────────────────────────────
export const getFailedLogins = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, dateFrom, dateTo } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE success = FALSE';
    const params = [];
    let paramIdx = 1;

    if (dateFrom) { where += ` AND created_at >= $${paramIdx}`; params.push(dateFrom); paramIdx++; }
    if (dateTo) { where += ` AND created_at <= $${paramIdx}`; params.push(dateTo + 'T23:59:59.999Z'); paramIdx++; }

    const [logsRes, countRes] = await Promise.all([
      dbService.query(
        `SELECT * FROM login_history ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      ),
      dbService.query(`SELECT COUNT(*) FROM login_history ${where}`, params),
    ]);

    res.json({
      logs: logsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        deviceInfo: r.device_info,
        failureReason: r.failure_reason,
        createdAt: r.created_at,
      })),
      total: parseInt(countRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
};

// ── Active Sessions ───────────────────────────────────────────────────────────
export const getActiveSessions = async (req, res, next) => {
  try {
    const result = await dbService.query(
      `SELECT s.*, u.name as user_name, u.username, u.role
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.is_active = TRUE
       ORDER BY s.last_active_at DESC`
    );

    res.json({
      sessions: result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        username: r.username,
        role: r.role,
        ipAddress: r.ip_address,
        deviceInfo: r.device_info,
        createdAt: r.created_at,
        lastActiveAt: r.last_active_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── Revoke Session ────────────────────────────────────────────────────────────
export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query(
      'UPDATE user_sessions SET is_active = FALSE, expired_at = NOW() WHERE id = $1',
      [id]
    );
    res.json({ message: 'Session revoked' });
  } catch (error) {
    next(error);
  }
};

// ── Login History ─────────────────────────────────────────────────────────────
export const getLoginHistory = async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (userId) {
      where += ` AND user_id = $${paramIdx}`;
      params.push(userId);
      paramIdx++;
    }

    const [logsRes, countRes] = await Promise.all([
      dbService.query(
        `SELECT * FROM login_history ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      ),
      dbService.query(`SELECT COUNT(*) FROM login_history ${where}`, params),
    ]);

    res.json({
      logs: logsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        success: r.success,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        deviceInfo: r.device_info,
        failureReason: r.failure_reason,
        createdAt: r.created_at,
      })),
      total: parseInt(countRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
};

// ── Security Overview Stats ───────────────────────────────────────────────────
export const getSecurityOverview = async (req, res, next) => {
  try {
    const [failedToday, failedWeek, activeSessions, suspiciousIPs] = await Promise.all([
      dbService.query(`SELECT COUNT(*) FROM login_history WHERE success = FALSE AND created_at > NOW() - INTERVAL '24 hours'`),
      dbService.query(`SELECT COUNT(*) FROM login_history WHERE success = FALSE AND created_at > NOW() - INTERVAL '7 days'`),
      dbService.query('SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE'),
      dbService.query(
        `SELECT ip_address, COUNT(*) as attempts FROM login_history 
         WHERE success = FALSE AND created_at > NOW() - INTERVAL '24 hours' AND ip_address IS NOT NULL
         GROUP BY ip_address HAVING COUNT(*) >= 3 ORDER BY attempts DESC LIMIT 10`
      ),
    ]);

    res.json({
      failedLoginsToday: parseInt(failedToday.rows[0].count),
      failedLoginsWeek: parseInt(failedWeek.rows[0].count),
      activeSessions: parseInt(activeSessions.rows[0].count),
      suspiciousIPs: suspiciousIPs.rows.map(r => ({ ip: r.ip_address, attempts: parseInt(r.attempts) })),
    });
  } catch (error) {
    next(error);
  }
};
