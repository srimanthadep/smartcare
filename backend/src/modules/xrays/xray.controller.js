import { dbService } from '../../core/db/db.service.js';
import { aiService } from '../ai/ai.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';
import { logActivity } from '../../shared/queue/jobQueue.service.js';
import { getThumbnailUrl, deleteFromCloudinary } from '../../core/config/cloudinary.js';

// ────────────────────────────────────────────────────────────────
// GET /api/xrays — List all X-rays with filters (global)
// ────────────────────────────────────────────────────────────────
export const getXrays = async (req, res, next) => {
  try {
    const { search, type, reviewed, from, to, toothNumber, patientId, uploadedBy } = req.query;

    let query = `
      SELECT x.*, p.name as patient_name, p.phone as patient_phone
      FROM xrays x
      LEFT JOIN patients p ON x.patient_id = p.id
      WHERE x.is_deleted = FALSE
    `;
    const params = [];

    if (patientId) {
      params.push(patientId);
      query += ` AND x.patient_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (
        LOWER(p.name) LIKE $${params.length}
        OR LOWER(p.id) LIKE $${params.length}
        OR LOWER(p.phone) LIKE $${params.length}
        OR LOWER(x.diagnosis) LIKE $${params.length}
        OR LOWER(x.notes) LIKE $${params.length}
      )`;
    }

    if (type && type !== 'all') {
      params.push(type);
      query += ` AND x.type = $${params.length}`;
    }

    if (reviewed !== undefined && reviewed !== '' && reviewed !== 'all') {
      params.push(reviewed === 'true');
      query += ` AND x.reviewed = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND x.created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND x.created_at <= ($${params.length}::date + interval '1 day')`;
    }

    if (toothNumber) {
      params.push(parseInt(toothNumber));
      query += ` AND x.tooth_numbers @> to_jsonb($${params.length}::int)`;
    }

    if (uploadedBy) {
      params.push(uploadedBy);
      query += ` AND x.uploaded_by = $${params.length}`;
    }

    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    query += ` ORDER BY x.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('xrays', result.rows));
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/xrays/stats — Analytics dashboard stats
// ────────────────────────────────────────────────────────────────
export const getXrayStats = async (req, res, next) => {
  try {
    const [totalRes, monthlyRes, pendingRes, recentRes, typeRes, trendRes] = await Promise.all([
      dbService.query('SELECT COUNT(*) as count FROM xrays WHERE is_deleted = FALSE'),
      dbService.query(`
        SELECT COUNT(*) as count FROM xrays
        WHERE is_deleted = FALSE
        AND created_at >= date_trunc('month', CURRENT_DATE)
      `),
      dbService.query('SELECT COUNT(*) as count FROM xrays WHERE is_deleted = FALSE AND reviewed = FALSE'),
      dbService.query(`
        SELECT x.*, p.name as patient_name
        FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
        WHERE x.is_deleted = FALSE
        ORDER BY x.created_at DESC LIMIT 5
      `),
      dbService.query(`
        SELECT type, COUNT(*) as count FROM xrays
        WHERE is_deleted = FALSE GROUP BY type ORDER BY count DESC
      `),
      dbService.query(`
        SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM xrays WHERE is_deleted = FALSE
        AND created_at >= CURRENT_DATE - interval '12 months'
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `),
    ]);

    res.json({
      total: parseInt(totalRes.rows[0]?.count || 0),
      monthlyUploads: parseInt(monthlyRes.rows[0]?.count || 0),
      pendingReview: parseInt(pendingRes.rows[0]?.count || 0),
      recentUploads: dbService.mapRows('xrays', recentRes.rows),
      typeDistribution: typeRes.rows.map(r => ({ type: r.type, count: parseInt(r.count) })),
      monthlyTrend: trendRes.rows.map(r => ({ month: r.month, count: parseInt(r.count) })),
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/xrays/:id — Get single X-ray
// ────────────────────────────────────────────────────────────────
export const getXray = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      `SELECT x.*, p.name as patient_name
       FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
       WHERE x.id = $1 AND x.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    res.json(dbService.mapRows('xrays', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/patients/:id/xrays — Get patient's X-rays
// ────────────────────────────────────────────────────────────────
export const getPatientXrays = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      `SELECT * FROM xrays WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC`,
      [id]
    );
    res.json(dbService.mapRows('xrays', result.rows));
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// POST /api/xrays — Upload new X-ray (multipart/form-data)
// ────────────────────────────────────────────────────────────────
export const createXray = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'X-ray file is required' });
    }

    const { patientId, type, toothNumbers, notes, diagnosis, tags, takenDate } = req.body;

    // Verify patient exists
    const patientCheck = await dbService.query(
      'SELECT id, name FROM patients WHERE id = $1 AND is_deleted = FALSE',
      [patientId]
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const id = await dbService.generateId('XR', 'xrays');
    const fileUrl = req.file.path || req.file.secure_url || req.file.url;
    const cloudinaryPublicId = req.file.filename || req.file.public_id || '';
    const isPdf = req.file.mimetype === 'application/pdf';
    const thumbnailUrl = isPdf ? null : getThumbnailUrl(fileUrl);

    const parsedToothNumbers = typeof toothNumbers === 'string' ? JSON.parse(toothNumbers) : (toothNumbers || []);
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);

    const query = `
      INSERT INTO xrays (
        id, patient_id, file_url, thumbnail_url, cloudinary_public_id,
        type, tooth_numbers, notes, diagnosis, tags, annotations,
        reviewed, uploaded_by, taken_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const params = [
      id, patientId, fileUrl, thumbnailUrl, cloudinaryPublicId,
      type || 'IOPA',
      JSON.stringify(parsedToothNumbers),
      notes || '',
      diagnosis || '',
      JSON.stringify(parsedTags),
      JSON.stringify([]), // annotations — empty for now, future AI support
      false, // reviewed
      req.user.username || req.user.sub,
      takenDate || new Date().toISOString().slice(0, 10),
    ];

    const result = await dbService.query(query, params);
    const xray = dbService.mapRows('xrays', result.rows)[0];

    // Audit log
    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: 'Upload X-Ray',
      details: `Uploaded ${type || 'IOPA'} X-ray for patient ${patientCheck.rows[0].name} (${patientId})`,
      ip: req.ip,
    });

    res.status(201).json(xray);
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// PATCH /api/xrays/:id — Update X-ray metadata
// ────────────────────────────────────────────────────────────────
export const updateXray = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const COLUMN_MAP = {
      type: 'type',
      toothNumbers: 'tooth_numbers',
      notes: 'notes',
      diagnosis: 'diagnosis',
      tags: 'tags',
      takenDate: 'taken_date',
    };

    const updates = ['updated_at = NOW()'];
    const params = [id];
    let i = 2;

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      updates.push(`${dbCol} = $${i}`);
      const needsJson = ['toothNumbers', 'tags'].includes(key);
      params.push(needsJson ? JSON.stringify(value) : value);
      i++;
    }

    if (updates.length <= 1) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const query = `UPDATE xrays SET ${updates.join(', ')} WHERE id = $1 AND is_deleted = FALSE RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    res.json(dbService.mapRows('xrays', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// PATCH /api/xrays/:id/review — Mark as reviewed/pending
// ────────────────────────────────────────────────────────────────
export const reviewXray = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewed } = req.body;

    const updates = reviewed
      ? 'reviewed = TRUE, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()'
      : 'reviewed = FALSE, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()';

    const params = reviewed ? [id, req.user.username || req.user.sub] : [id];

    const query = `UPDATE xrays SET ${updates} WHERE id = $1 AND is_deleted = FALSE RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: reviewed ? 'Review X-Ray' : 'Unreview X-Ray',
      details: `${reviewed ? 'Reviewed' : 'Unreviewed'} X-ray ${id}`,
      ip: req.ip,
    });

    res.json(dbService.mapRows('xrays', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// DELETE /api/xrays/:id — Soft delete
// ────────────────────────────────────────────────────────────────
export const deleteXray = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the x-ray for Cloudinary cleanup info
    const existing = await dbService.query(
      'SELECT cloudinary_public_id, type FROM xrays WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    // Soft delete (don't remove from Cloudinary to allow recovery)
    await dbService.query(
      'UPDATE xrays SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: 'Delete X-Ray',
      details: `Deleted X-ray ${id}`,
      ip: req.ip,
    });

    res.json({ message: 'X-ray deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// POST /api/xrays/:id/analyze — AI Analysis using Gemini
// ────────────────────────────────────────────────────────────────
export const analyzeXray = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Get X-ray and patient info
    const result = await dbService.query(
      `SELECT x.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender, 
              p.allergies as patient_allergies, p.conditions as patient_conditions
       FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
       WHERE x.id = $1 AND x.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    const xray = result.rows[0];
    
    // 2. Prepare context
    const patientContext = {
      name: xray.patient_name,
      age: xray.patient_age,
      gender: xray.patient_gender,
      allergies: xray.patient_allergies,
      conditions: xray.patient_conditions,
      xrayType: xray.type
    };

    // 3. Call AI Service
    const analysis = await aiService.analyzeXray(xray.file_url, patientContext);

    // 4. Update X-ray record with AI findings if diagnosis/notes are empty
    // Or we can save them into 'annotations' or 'ai_analysis' field
    // For now, let's update 'notes' and 'diagnosis' if they are empty, 
    // and always update 'annotations' with the full analysis.
    
    const updatedAnnotations = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
      analyzedBy: 'Gemini AI'
    };

    const updateQuery = `
      UPDATE xrays 
      SET 
        annotations = $2,
        diagnosis = CASE WHEN diagnosis = '' OR diagnosis IS NULL THEN $3 ELSE diagnosis END,
        notes = CASE WHEN notes = '' OR notes IS NULL THEN $4 ELSE notes END,
        tooth_numbers = CASE WHEN tooth_numbers = '[]'::jsonb OR tooth_numbers IS NULL THEN $5 ELSE tooth_numbers END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const updateParams = [
      id,
      JSON.stringify(updatedAnnotations),
      analysis.diagnosis,
      analysis.findings.join('\n'),
      JSON.stringify(analysis.affectedTeeth || [])
    ];

    const updateResult = await dbService.query(updateQuery, updateParams);
    const updatedXray = dbService.mapRows('xrays', updateResult.rows)[0];

    // Audit log
    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: 'AI X-Ray Analysis',
      details: `Gemini AI analyzed X-ray ${id}. Confidence: ${analysis.confidence}`,
      ip: req.ip,
    });

    res.json(updatedXray);
  } catch (error) {
    console.error('AI Analysis Controller Error:', error);
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/xrays/:id/download — Download professional report PDF
// ────────────────────────────────────────────────────────────────
export const downloadXrayReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pdfService } = await import('../../shared/services/pdf.service.js');

    // 1. Get X-ray and patient info
    const result = await dbService.query(
      `SELECT x.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender, p.phone as patient_phone
       FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
       WHERE x.id = $1 AND x.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    const xray = dbService.mapRows('xrays', result.rows)[0];
    const patient = {
      id: xray.patientId,
      name: xray.patientName,
      age: xray.patientAge,
      gender: xray.patientGender,
      phone: xray.patientPhone
    };

    const pdfBuffer = await pdfService.generateXRayReportPDF(patient, xray);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=XRay_Report_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// POST /api/xrays/:id/send-whatsapp — Send X-ray report via WhatsApp
// ────────────────────────────────────────────────────────────────
export const sendXrayWhatsapp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { whatsappService } = await import('../whatsapp/whatsapp.service.js');

    const result = await dbService.query(
      `SELECT x.*, p.name as patient_name, p.phone as patient_phone, p.age as patient_age, p.gender as patient_gender, p.email as patient_email
       FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
       WHERE x.id = $1 AND x.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    const xray = dbService.mapRows('xrays', result.rows)[0];
    const patient = {
      id: xray.patientId,
      name: xray.patientName,
      phone: xray.patientPhone,
      age: xray.patientAge,
      gender: xray.patientGender,
      email: xray.patientEmail
    };

    if (!patient.phone) {
      return res.status(400).json({ message: 'Patient phone number is missing' });
    }

    whatsappService.sendXrayReport(patient, xray);

    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: 'Send X-Ray WhatsApp',
      details: `Sent X-ray report ${id} to patient ${patient.name} via WhatsApp`,
      ip: req.ip,
    });

    res.json({ message: 'WhatsApp message queued for delivery' });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// POST /api/xrays/:id/send-email — Send X-ray report via Email
// ────────────────────────────────────────────────────────────────
export const sendXrayEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sendEmailJob } = await import('../../shared/queue/jobQueue.service.js');
    const { emailService } = await import('../../shared/services/email.service.js');

    const result = await dbService.query(
      `SELECT x.*, p.name as patient_name, p.phone as patient_phone, p.age as patient_age, p.gender as patient_gender, p.email as patient_email
       FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
       WHERE x.id = $1 AND x.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'X-ray not found' });
    }

    const xray = dbService.mapRows('xrays', result.rows)[0];
    const patient = {
      id: xray.patientId,
      name: xray.patientName,
      phone: xray.patientPhone,
      age: xray.patientAge,
      gender: xray.patientGender,
      email: xray.patientEmail
    };

    if (!patient.email) {
      return res.status(400).json({ message: 'Patient email address is missing' });
    }

    sendEmailJob('email-xray-report', () => emailService.sendXrayEmail(patient, xray));

    logActivity({
      userId: req.user.sub,
      userName: req.user.username,
      action: 'Send X-Ray Email',
      details: `Sent X-ray report ${id} to patient ${patient.name} via Email`,
      ip: req.ip,
    });

    res.json({ message: 'Email report queued for delivery' });
  } catch (error) {
    next(error);
  }
};
