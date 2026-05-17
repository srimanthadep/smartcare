import { dbService } from '../../core/db/db.service.js';
import { logAudit } from './audit.service.js';

// Supported entity types and their table names
const ENTITY_MAP = {
  patients: { table: 'patients', label: 'Patient' },
  invoices: { table: 'invoices', label: 'Invoice' },
  appointments: { table: 'appointments', label: 'Appointment' },
  prescriptions: { table: 'prescriptions', label: 'Prescription' },
  expenses: { table: 'expenses', label: 'Expense' },
  users: { table: 'users', label: 'User' },
};

// Whitelist to prevent SQL injection on table name
const getAllowedTable = (entityType) => {
  const entity = ENTITY_MAP[entityType];
  if (!entity) return null;
  return entity;
};

// ── List Deleted Items ────────────────────────────────────────────────────────
export const listDeleted = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { search, page = 1, limit = 20 } = req.query;
    const entity = getAllowedTable(entityType);
    if (!entity) return res.status(400).json({ message: `Invalid entity type: ${entityType}` });

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let selectFields = 't.*';
    let joinClause = '';
    let searchCond = '';

    const hasPatient = ['invoices', 'appointments', 'prescriptions'].includes(entityType);

    let where = 'WHERE t.is_deleted = TRUE';
    const params = [];
    let paramIdx = 1;

    if (hasPatient) {
      selectFields = 't.*, p.name AS patient_name';
      joinClause = 'LEFT JOIN patients p ON t.patient_id = p.id';
      if (search) {
        searchCond = ` AND (LOWER(COALESCE(p.name, '')) LIKE $${paramIdx} OR LOWER(t.id) LIKE $${paramIdx})`;
        params.push(`%${search.toLowerCase()}%`);
        paramIdx++;
      }
    } else {
      if (search) {
        searchCond = ` AND (LOWER(COALESCE(t.name, '')) LIKE $${paramIdx} OR LOWER(t.id) LIKE $${paramIdx})`;
        params.push(`%${search.toLowerCase()}%`);
        paramIdx++;
      }
    }

    if (searchCond) {
      where += searchCond;
    }

    const queryStr = `SELECT ${selectFields} FROM ${entity.table} t ${joinClause} ${where} ORDER BY COALESCE(t.deleted_at, t.created_at, NOW()) DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    const countStr = `SELECT COUNT(*) FROM ${entity.table} t ${joinClause} ${where}`;

    const [itemsRes, countRes] = await Promise.all([
      dbService.query(queryStr, [...params, limitNum, offset]),
      dbService.query(countStr, params),
    ]);

    const items = dbService.mapRows(entity.table, itemsRes.rows).map(item => ({
      ...item,
      deletedBy: item.deleted_by,
      deletedAt: item.deleted_at || item.created_at || new Date().toISOString(),
      deleteReason: item.delete_reason,
      patientName: item.patient_name || item.patientName
    }));

    res.json({
      items,
      total: parseInt(countRes.rows[0].count),
      page: pageNum,
      limit: limitNum,
      entityType,
    });
  } catch (error) {
    next(error);
  }
};

// ── Restore Item ──────────────────────────────────────────────────────────────
export const restoreItem = async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const entity = getAllowedTable(entityType);
    if (!entity) return res.status(400).json({ message: `Invalid entity type: ${entityType}` });

    const checkRes = await dbService.query(`SELECT id FROM ${entity.table} WHERE id = $1 AND is_deleted = TRUE`, [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ message: `Deleted ${entity.label} not found` });

    await dbService.query(
      `UPDATE ${entity.table} SET is_deleted = FALSE, deleted_by = NULL, deleted_at = NULL, delete_reason = NULL WHERE id = $1`,
      [id]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: `${entity.label.toUpperCase()}_RESTORED`, entityType, entityId: id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `${entity.label} restored successfully` });
  } catch (error) {
    next(error);
  }
};

// ── Permanent Delete ──────────────────────────────────────────────────────────
export const permanentDelete = async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const entity = getAllowedTable(entityType);
    if (!entity) return res.status(400).json({ message: `Invalid entity type: ${entityType}` });

    const checkRes = await dbService.query(`SELECT id FROM ${entity.table} WHERE id = $1 AND is_deleted = TRUE`, [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ message: `Deleted ${entity.label} not found` });

    await dbService.query(`DELETE FROM ${entity.table} WHERE id = $1`, [id]);

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: `${entity.label.toUpperCase()}_PERMANENTLY_DELETED`, entityType, entityId: id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `${entity.label} permanently deleted` });
  } catch (error) {
    next(error);
  }
};

// ── Bulk Restore ──────────────────────────────────────────────────────────────
export const bulkRestore = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { ids } = req.body;
    const entity = getAllowedTable(entityType);
    if (!entity) return res.status(400).json({ message: `Invalid entity type: ${entityType}` });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids array is required' });

    const result = await dbService.query(
      `UPDATE ${entity.table} SET is_deleted = FALSE, deleted_by = NULL, deleted_at = NULL, delete_reason = NULL WHERE id = ANY($1) AND is_deleted = TRUE`,
      [ids]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: `${entity.label.toUpperCase()}_BULK_RESTORED`, entityType,
      metadata: { count: result.rowCount, ids },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `${result.rowCount} ${entity.label}(s) restored`, count: result.rowCount });
  } catch (error) {
    next(error);
  }
};

// ── Bulk Permanent Delete ─────────────────────────────────────────────────────
export const bulkPermanentDelete = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { ids } = req.body;
    const entity = getAllowedTable(entityType);
    if (!entity) return res.status(400).json({ message: `Invalid entity type: ${entityType}` });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids array is required' });

    const result = await dbService.query(
      `DELETE FROM ${entity.table} WHERE id = ANY($1) AND is_deleted = TRUE`,
      [ids]
    );

    await logAudit({
      actorId: req.user.sub, actorName: req.user.username, actorRole: req.user.role,
      action: `${entity.label.toUpperCase()}_BULK_PERMANENTLY_DELETED`, entityType,
      metadata: { count: result.rowCount, ids },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: `${result.rowCount} ${entity.label}(s) permanently deleted`, count: result.rowCount });
  } catch (error) {
    next(error);
  }
};
