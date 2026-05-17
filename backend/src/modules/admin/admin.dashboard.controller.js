import { dbService } from '../../core/db/db.service.js';
import { logAudit } from './audit.service.js';

// ── Admin Dashboard Stats ────────────────────────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    const [
      usersRes, patientsRes, invoicesRes, appointmentsRes,
      auditCountRes, notifCountRes, sessionsRes, recentAuditRes,
    ] = await Promise.all([
      dbService.query(`SELECT COUNT(*) as total, 
        COUNT(*) FILTER (WHERE status = 'active' AND is_deleted = FALSE) as active,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as active_today
        FROM users WHERE is_deleted = FALSE`),
      dbService.query('SELECT COUNT(*) FROM patients WHERE is_deleted = FALSE'),
      dbService.query('SELECT COUNT(*) as total, SUM(total) as revenue, SUM(paid_amount) as paid FROM invoices WHERE is_deleted = FALSE'),
      dbService.query(`SELECT COUNT(*) FROM appointments WHERE date = CURRENT_DATE AND is_deleted = FALSE`),
      dbService.query('SELECT COUNT(*) FROM audit_logs'),
      dbService.query('SELECT COUNT(*) FROM admin_notifications WHERE is_read = FALSE'),
      dbService.query('SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE'),
      dbService.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10'),
    ]);

    const userStats = usersRes.rows[0];
    const invoiceStats = invoicesRes.rows[0];

    // Deleted items counts per entity
    const [delPat, delInv, delAppt, delPx, delExp, delUsers] = await Promise.all([
      dbService.query('SELECT COUNT(*) FROM patients WHERE is_deleted = TRUE'),
      dbService.query('SELECT COUNT(*) FROM invoices WHERE is_deleted = TRUE'),
      dbService.query('SELECT COUNT(*) FROM appointments WHERE is_deleted = TRUE'),
      dbService.query('SELECT COUNT(*) FROM prescriptions WHERE is_deleted = TRUE'),
      dbService.query('SELECT COUNT(*) FROM expenses WHERE is_deleted = TRUE'),
      dbService.query('SELECT COUNT(*) FROM users WHERE is_deleted = TRUE'),
    ]);

    res.json({
      users: {
        total: parseInt(userStats.total),
        active: parseInt(userStats.active),
        activeToday: parseInt(userStats.active_today),
      },
      patients: parseInt(patientsRes.rows[0].count),
      invoices: {
        total: parseInt(invoiceStats.total),
        revenue: Number(invoiceStats.revenue || 0),
        paid: Number(invoiceStats.paid || 0),
        pending: Number(invoiceStats.revenue || 0) - Number(invoiceStats.paid || 0),
      },
      appointmentsToday: parseInt(appointmentsRes.rows[0].count),
      auditLogsTotal: parseInt(auditCountRes.rows[0].count),
      unreadNotifications: parseInt(notifCountRes.rows[0].count),
      activeSessions: parseInt(sessionsRes.rows[0].count),
      deletedItems: {
        patients: parseInt(delPat.rows[0].count),
        invoices: parseInt(delInv.rows[0].count),
        appointments: parseInt(delAppt.rows[0].count),
        prescriptions: parseInt(delPx.rows[0].count),
        expenses: parseInt(delExp.rows[0].count),
        users: parseInt(delUsers.rows[0].count),
      },
      recentActivity: recentAuditRes.rows.map(r => ({
        ...r,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        entityType: r.entity_type,
        entityId: r.entity_id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};
