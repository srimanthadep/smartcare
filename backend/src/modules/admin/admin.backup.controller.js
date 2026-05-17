import { dbService } from '../../core/db/db.service.js';
import { performFullBackup } from '../../shared/services/backup.service.js';
import { logAudit, logBackupEvent } from './audit.service.js';

export const getBackupHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
    const [historyRes, countRes] = await Promise.all([
      dbService.query('SELECT * FROM backup_history ORDER BY started_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), offset]),
      dbService.query('SELECT COUNT(*) FROM backup_history'),
    ]);
    res.json({
      backups: historyRes.rows.map(r => ({
        id: r.id, status: r.status, fileName: r.file_name, fileSize: r.file_size,
        triggeredBy: r.triggered_by, errorMessage: r.error_message,
        startedAt: r.started_at, completedAt: r.completed_at,
      })),
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page), limit: parseInt(limit),
    });
  } catch (error) { next(error); }
};

let backupInProgress = false;
export const triggerBackup = async (req, res, next) => {
  if (backupInProgress) return res.status(429).json({ message: 'Backup already in progress' });
  try {
    backupInProgress = true;
    await logBackupEvent({ status: 'in_progress', triggeredBy: req.user.username });
    performFullBackup().then(async (zipFile) => {
      const fs = await import('fs');
      const path = await import('path');
      const stat = fs.default.statSync(zipFile);
      await logBackupEvent({ status: 'completed', fileName: path.default.basename(zipFile), fileSize: stat.size, triggeredBy: req.user.username });
      backupInProgress = false;
    }).catch(async (err) => {
      await logBackupEvent({ status: 'failed', triggeredBy: req.user.username, errorMessage: err.message });
      backupInProgress = false;
    });
    await logAudit({ actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role, action: 'BACKUP_TRIGGERED', entityType: 'backup', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ message: 'Backup triggered successfully' });
  } catch (error) { backupInProgress = false; next(error); }
};
