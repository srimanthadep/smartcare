import { dbService } from '../../core/db/db.service.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

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

// ── Export Audit Logs as XLSX ────────────────────────────────────────────────
export const exportXLSX = async (req, res, next) => {
  try {
    const { search, action, entityType, actorId, actorRole, dateFrom, dateTo } = req.query;
    
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

    const logsRes = await dbService.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC`,
      params
    );

    const data = logsRes.rows.map(r => {
      let detailsVal = 'N/A';
      if (r.metadata) {
        try {
          const parsed = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
          detailsVal = parsed.details || parsed.message || JSON.stringify(parsed);
        } catch (e) {
          detailsVal = String(r.metadata);
        }
      }
      return {
        'ID': r.id,
        'Timestamp': r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A',
        'Actor Name': r.actor_name || 'System',
        'Actor Role': r.actor_role || 'user',
        'Action': r.action || 'N/A',
        'Entity': r.entity_type ? `${r.entity_type} #${r.entity_id || ''}` : 'N/A',
        'Patient Name': r.patient_name || 'N/A',
        'IP Address': r.ip_address || 'N/A',
        'Details': detailsVal
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=activity_logs.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ── Export Audit Logs as PDF ─────────────────────────────────────────────────
export const exportPDF = async (req, res, next) => {
  try {
    const { search, action, entityType, actorId, actorRole, dateFrom, dateTo } = req.query;
    
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

    const logsRes = await dbService.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC`,
      params
    );

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=activity_logs.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Title and Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#18181b').text('SmartCare - Centralized Activity Logs', { align: 'center' });
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#71717a').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Draw table headers
    const startY = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#18181b');
    doc.text('Timestamp', 30, startY, { width: 100 });
    doc.text('Actor', 130, startY, { width: 100 });
    doc.text('Action', 230, startY, { width: 100 });
    doc.text('Details', 330, startY, { width: 180 });
    doc.text('IP Address', 515, startY, { width: 50, align: 'right' });

    doc.moveTo(30, startY + 12).lineTo(565, startY + 12).strokeColor('#e4e4e7').lineWidth(1).stroke();
    doc.moveDown(0.8);

    doc.font('Helvetica').fontSize(8).fillColor('#3f3f46');
    
    for (const r of logsRes.rows) {
      if (doc.y > 780) {
        doc.addPage();
        const newY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#18181b');
        doc.text('Timestamp', 30, newY, { width: 100 });
        doc.text('Actor', 130, newY, { width: 100 });
        doc.text('Action', 230, newY, { width: 100 });
        doc.text('Details', 330, newY, { width: 180 });
        doc.text('IP Address', 515, newY, { width: 50, align: 'right' });

        doc.moveTo(30, newY + 12).lineTo(565, newY + 12).strokeColor('#e4e4e7').lineWidth(1).stroke();
        doc.moveDown(0.8);
        doc.font('Helvetica').fontSize(8).fillColor('#3f3f46');
      }

      const timestamp = r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A';
      const actor = `${r.actor_name || 'System'} (${r.actor_role || 'user'})`;
      const action = (r.action || 'N/A').replace(/_/g, ' ');
      
      let details = 'N/A';
      if (r.metadata) {
        try {
          const parsed = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
          details = parsed.details || parsed.message || JSON.stringify(parsed);
        } catch (e) {
          details = String(r.metadata);
        }
      }
      const ip = r.ip_address || 'N/A';

      const currentY = doc.y;
      doc.text(timestamp, 30, currentY, { width: 95 });
      doc.text(actor, 130, currentY, { width: 95 });
      doc.text(action, 230, currentY, { width: 95 });
      
      const detailsY = doc.y;
      doc.text(details, 330, currentY, { width: 180 });
      const detailsHeight = doc.y - currentY;
      
      doc.text(ip, 515, currentY, { width: 50, align: 'right' });

      const maxHeight = Math.max(12, detailsHeight);
      doc.y = currentY + maxHeight + 8;
      
      doc.moveTo(30, doc.y - 4).lineTo(565, doc.y - 4).strokeColor('#f4f4f5').lineWidth(0.5).stroke();
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
