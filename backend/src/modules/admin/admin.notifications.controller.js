import { dbService } from '../../core/db/db.service.js';

// ── List Notifications ────────────────────────────────────────────────────────
export const listNotifications = async (req, res, next) => {
  try {
    const { type, severity, isRead, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (type) { where += ` AND type = $${paramIdx}`; params.push(type); paramIdx++; }
    if (severity) { where += ` AND severity = $${paramIdx}`; params.push(severity); paramIdx++; }
    if (isRead !== undefined) { where += ` AND is_read = $${paramIdx}`; params.push(isRead === 'true'); paramIdx++; }

    const [notifsRes, countRes, unreadRes] = await Promise.all([
      dbService.query(
        `SELECT * FROM admin_notifications ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      ),
      dbService.query(`SELECT COUNT(*) FROM admin_notifications ${where}`, params),
      dbService.query('SELECT COUNT(*) FROM admin_notifications WHERE is_read = FALSE'),
    ]);

    res.json({
      notifications: notifsRes.rows.map(r => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        title: r.title,
        message: r.message,
        metadata: r.metadata,
        isRead: r.is_read,
        createdAt: r.created_at,
      })),
      total: parseInt(countRes.rows[0].count),
      unreadCount: parseInt(unreadRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
};

// ── Mark as Read ──────────────────────────────────────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE admin_notifications SET is_read = TRUE WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// ── Mark All as Read ──────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await dbService.query('UPDATE admin_notifications SET is_read = TRUE WHERE is_read = FALSE');
    res.json({ message: `${result.rowCount} notification(s) marked as read` });
  } catch (error) {
    next(error);
  }
};
