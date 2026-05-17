import { dbService } from '../../core/db/db.service.js';

// ── List Audit Logs ──────────────────────────────────────────────────────────
export const listAuditLogs = async (req, res, next) => {
  try {
    const { search, action, entityType, actorId, actorRole, dateFrom, dateTo, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (search) {
      where += ` AND (LOWER(actor_name) LIKE $${paramIdx} OR LOWER(action) LIKE $${paramIdx} OR LOWER(entity_type) LIKE $${paramIdx} OR LOWER(entity_id) LIKE $${paramIdx} OR LOWER(patient_name) LIKE $${paramIdx})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }
    if (action) {
      where += ` AND action = $${paramIdx}`;
      params.push(action);
      paramIdx++;
    }
    if (entityType) {
      where += ` AND entity_type = $${paramIdx}`;
      params.push(entityType);
      paramIdx++;
    }
    if (actorId) {
      where += ` AND actor_id = $${paramIdx}`;
      params.push(actorId);
      paramIdx++;
    }
    if (actorRole) {
      where += ` AND actor_role = $${paramIdx}`;
      params.push(actorRole);
      paramIdx++;
    }
    if (dateFrom) {
      where += ` AND created_at >= $${paramIdx}`;
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      where += ` AND created_at <= $${paramIdx}`;
      params.push(dateTo + 'T23:59:59.999Z');
      paramIdx++;
    }

    const [logsRes, countRes] = await Promise.all([
      dbService.query(
        `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      ),
      dbService.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params),
    ]);

    const logs = logsRes.rows.map(r => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      metadata: r.metadata,
      oldData: r.old_data,
      newData: r.new_data,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));

    res.json({
      logs,
      total: parseInt(countRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
};

// ── Get distinct filter options ──────────────────────────────────────────────
export const getAuditFilters = async (req, res, next) => {
  try {
    const [actions, entityTypes, actors] = await Promise.all([
      dbService.query('SELECT DISTINCT action FROM audit_logs ORDER BY action'),
      dbService.query('SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type'),
      dbService.query('SELECT DISTINCT actor_id, actor_name, actor_role FROM audit_logs WHERE actor_id IS NOT NULL ORDER BY actor_name'),
    ]);

    res.json({
      actions: actions.rows.map(r => r.action),
      entityTypes: entityTypes.rows.map(r => r.entity_type),
      actors: actors.rows.map(r => ({ id: r.actor_id, name: r.actor_name, role: r.actor_role })),
    });
  } catch (error) {
    next(error);
  }
};
