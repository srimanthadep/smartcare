import { Router } from 'express';
import { authorizeAdmin } from '../../core/middleware/admin.middleware.js';
import * as dashboard from './admin.dashboard.controller.js';
import * as users from './admin.users.controller.js';
import * as audit from './admin.audit.controller.js';
import * as recovery from './admin.recovery.controller.js';
import * as health from './admin.health.controller.js';
import * as security from './admin.security.controller.js';
import * as notifications from './admin.notifications.controller.js';
import * as backup from './admin.backup.controller.js';
import * as ai from './admin.ai.controller.js';
import { getQueueStats } from '../../shared/queue/jobQueue.service.js';

const router = Router();

// Recovery Authorization for Admin or Doctor
const authorizeAdminOrDoctor = () => {
  return (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Admin or Doctor access required' });
    }
    next();
  };
};

// Recovery Center (Accessible by Doctor or Admin)
router.get('/recovery/:entityType', authorizeAdminOrDoctor(), recovery.listDeleted);
router.post('/recovery/:entityType/:id/restore', authorizeAdminOrDoctor(), recovery.restoreItem);
router.delete('/recovery/:entityType/:id', authorizeAdminOrDoctor(), recovery.permanentDelete);
router.post('/recovery/:entityType/bulk-restore', authorizeAdminOrDoctor(), recovery.bulkRestore);
router.post('/recovery/:entityType/bulk-delete', authorizeAdminOrDoctor(), recovery.bulkPermanentDelete);

// All other admin routes require strict admin role
router.use(authorizeAdmin());

// Dashboard
router.get('/dashboard', dashboard.getDashboard);

// User Management
router.get('/users', users.listUsers);
router.post('/users', users.createUser);
router.patch('/users/:id', users.updateUser);
router.patch('/users/:id/role', users.changeRole);
router.post('/users/:id/reset-password', users.resetPassword);
router.patch('/users/:id/status', users.changeStatus);
router.delete('/users/:id', users.deleteUser);
router.post('/users/:id/restore', users.restoreUser);
router.post('/users/:id/force-logout', users.forceLogout);

// Audit Logs
router.get('/audit-logs', audit.listAuditLogs);
router.get('/audit-logs/filters', audit.getAuditFilters);
router.get('/audit-logs/export/xlsx', audit.exportXLSX);
router.get('/audit-logs/export/pdf', audit.exportPDF);

// System Health
router.get('/health', health.getHealth);

// Security Center
router.get('/security/overview', security.getSecurityOverview);
router.get('/security/failed-logins', security.getFailedLogins);
router.get('/security/sessions', security.getActiveSessions);
router.post('/security/sessions/:id/revoke', security.revokeSession);
router.get('/security/login-history', security.getLoginHistory);

// Notifications
router.get('/notifications', notifications.listNotifications);
router.patch('/notifications/:id/read', notifications.markAsRead);
router.post('/notifications/mark-all-read', notifications.markAllAsRead);

// Backup Center
router.get('/backups', backup.getBackupHistory);
router.post('/backups/trigger', backup.triggerBackup);

// AI Analytics
router.get('/ai/analytics', ai.getAIAnalytics);

// Queue Monitor (in-memory queue)
router.get('/queue/stats', (req, res) => {
  res.json(getQueueStats());
});

export default router;
