import { dbService } from '../../core/db/db.service.js';
import { emitEvent } from '../../shared/sockets/socket.service.js';

/**
 * Centralized audit logging service for all admin-tracked operations.
 * This is the advanced replacement for the simple logActivity() calls.
 */
export const logAudit = async ({
  actorId,
  actorName,
  actorRole,
  action,
  entityType,
  entityId,
  patientId,
  patientName,
  metadata = {},
  oldData,
  newData,
  ipAddress,
  userAgent,
}) => {
  const id = `AUD${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    await dbService.query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, patient_id, patient_name, metadata, old_data, new_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id, actorId, actorName, actorRole, action,
        entityType || null, entityId || null,
        patientId || null, patientName || null,
        JSON.stringify(metadata),
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null, userAgent || null,
      ]
    );
    emitEvent('ADMIN_AUDIT_LOG', { id, actorName, action, entityType, entityId, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('[AuditService] Failed to log audit:', err.message);
  }
};

/**
 * Create an admin notification and emit it via socket
 */
export const createAdminNotification = async ({ type, severity = 'info', title, message, metadata = {} }) => {
  const id = `NOTIF${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    await dbService.query(
      `INSERT INTO admin_notifications (id, type, severity, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, type, severity, title, message || '', JSON.stringify(metadata)]
    );
    emitEvent('ADMIN_NOTIFICATION', { id, type, severity, title, message, metadata, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('[AuditService] Failed to create notification:', err.message);
  }
};

/**
 * Log AI usage for analytics tracking
 */
export const logAIUsage = async ({ userId, userName, tool, tokensUsed = 0, estimatedCost = 0, responseTimeMs = 0, success = true, errorMessage }) => {
  const id = `AI${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    await dbService.query(
      `INSERT INTO ai_usage_logs (id, user_id, user_name, tool, tokens_used, estimated_cost, response_time_ms, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, userName, tool, tokensUsed, estimatedCost, responseTimeMs, success, errorMessage || null]
    );
  } catch (err) {
    console.error('[AuditService] Failed to log AI usage:', err.message);
  }
};

/**
 * Log login attempt (success or failure)
 */
export const logLoginAttempt = async ({ userId, username, success, ipAddress, userAgent, failureReason }) => {
  const id = `LH${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const ua = userAgent || '';
    const deviceInfo = {
      browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other',
      platform: ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Unknown',
    };
    await dbService.query(
      `INSERT INTO login_history (id, user_id, username, success, ip_address, user_agent, device_info, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, userId || null, username, success, ipAddress || null, userAgent || null, JSON.stringify(deviceInfo), failureReason || null]
    );

    if (!success) {
      // Check for suspicious login spike (>5 failures from same IP in 10 min)
      const recentFailures = await dbService.query(
        `SELECT COUNT(*) FROM login_history WHERE ip_address = $1 AND success = FALSE AND created_at > NOW() - INTERVAL '10 minutes'`,
        [ipAddress]
      );
      if (parseInt(recentFailures.rows[0].count) >= 5) {
        await createAdminNotification({
          type: 'security',
          severity: 'warning',
          title: 'Suspicious Login Activity',
          message: `${recentFailures.rows[0].count} failed login attempts from IP ${ipAddress} in the last 10 minutes`,
          metadata: { ip: ipAddress, username },
        });
      }
    }
  } catch (err) {
    console.error('[AuditService] Failed to log login attempt:', err.message);
  }
};

/**
 * Track user session
 */
export const createUserSession = async ({ userId, tokenHash, ipAddress, userAgent }) => {
  const id = `SES${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const ua = userAgent || '';
    const deviceInfo = {
      browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other',
      platform: ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown',
    };
    await dbService.query(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, device_info)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, tokenHash, ipAddress || null, userAgent || null, JSON.stringify(deviceInfo)]
    );
    return id;
  } catch (err) {
    console.error('[AuditService] Failed to create session:', err.message);
  }
};

/**
 * Log backup event
 */
export const logBackupEvent = async ({ status, fileName, fileSize, triggeredBy, errorMessage }) => {
  const id = `BKP${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    await dbService.query(
      `INSERT INTO backup_history (id, status, file_name, file_size, triggered_by, error_message, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, status, fileName || null, fileSize || null, triggeredBy || 'system', errorMessage || null, status !== 'pending' ? new Date().toISOString() : null]
    );
    if (status === 'failed') {
      await createAdminNotification({
        type: 'backup',
        severity: 'error',
        title: 'Backup Failed',
        message: errorMessage || 'Database backup failed',
        metadata: { backupId: id },
      });
    }
  } catch (err) {
    console.error('[AuditService] Failed to log backup event:', err.message);
  }
};
