import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';
import { logActivity, sendEmailJob, sendWhatsAppJob } from '../../shared/queue/jobQueue.service.js';
import { emailService } from '../../shared/services/email.service.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';

// --- Helper: Emit live referral event ---
const emitReferralUpdate = (type, data) => {
  emitEvent('REFERRAL_UPDATED', { type, data });
};

// ==========================================
// 1. Referral Sources CRM
// ==========================================

export const getReferralSources = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const result = await dbService.query(
      `SELECT * FROM referral_sources 
       WHERE is_deleted = FALSE 
       ORDER BY total_referrals DESC, total_revenue DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(dbService.mapRows('referral_sources', result.rows));
  } catch (error) { next(error); }
};

export const getReferralSourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      'SELECT * FROM referral_sources WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Referral source not found' });
    res.json(dbService.mapRows('referral_sources', result.rows)[0]);
  } catch (error) { next(error); }
};

export const createReferralSource = async (req, res, next) => {
  try {
    const id = await dbService.generateId('RS', 'referral_sources');
    const { name, type, contactName, phone, email, address, commissionType, commissionValue, status } = req.body;

    const query = `
      INSERT INTO referral_sources 
        (id, name, type, contact_name, phone, email, address, commission_type, commission_value, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await dbService.query(query, [
      id, name, type, contactName || null, phone || null, email || null,
      address || null, commissionType || 'percentage', commissionValue || 0, status || 'active'
    ]);

    const source = dbService.mapRows('referral_sources', result.rows)[0];
    emitReferralUpdate('SOURCE_CREATED', source);

    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Create Referral Source', details: `Created referral source: ${name} (${type})`, ip: req.ip
    });

    res.status(201).json(source);
  } catch (error) { next(error); }
};

export const updateReferralSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const updates = [];
    const params = [id];
    let i = 2;

    const COLUMN_MAP = {
      name: 'name', type: 'type',
      contactName: 'contact_name', contact_name: 'contact_name',
      phone: 'phone', email: 'email', address: 'address',
      commissionType: 'commission_type', commission_type: 'commission_type',
      commissionValue: 'commission_value', commission_value: 'commission_value',
      status: 'status',
    };

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      updates.push(`${dbCol} = $${i}`);
      params.push(value);
      i++;
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const query = `UPDATE referral_sources SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Referral source not found' });

    const source = dbService.mapRows('referral_sources', result.rows)[0];
    emitReferralUpdate('SOURCE_UPDATED', source);

    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Update Referral Source', details: `Updated referral source: ${source.name}`, ip: req.ip
    });

    res.json(source);
  } catch (error) { next(error); }
};

export const deleteReferralSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      'UPDATE referral_sources SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Referral source not found' });

    emitReferralUpdate('SOURCE_DELETED', { id });
    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Delete Referral Source', details: `Soft deleted referral source ID: ${id}`, ip: req.ip
    });

    res.json({ message: 'Referral source deleted successfully' });
  } catch (error) { next(error); }
};

// ==========================================
// 2. Patient Referrals Workflow Pipeline
// ==========================================

export const getPatientReferrals = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const result = await dbService.query(
      `SELECT pr.*, rs.name as source_name, rs.type as source_type, d.name as doctor_name
       FROM patient_referrals pr
       LEFT JOIN referral_sources rs ON pr.source_id = rs.id
       LEFT JOIN doctors d ON pr.referred_to_doctor_id = d.id
       WHERE pr.is_deleted = FALSE 
       ORDER BY pr.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(dbService.mapRows('patient_referrals', result.rows));
  } catch (error) { next(error); }
};

export const getPatientReferralById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      `SELECT pr.*, rs.name as source_name, rs.type as source_type, d.name as doctor_name
       FROM patient_referrals pr
       LEFT JOIN referral_sources rs ON pr.source_id = rs.id
       LEFT JOIN doctors d ON pr.referred_to_doctor_id = d.id
       WHERE pr.id = $1 AND pr.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Patient referral not found' });
    res.json(dbService.mapRows('patient_referrals', result.rows)[0]);
  } catch (error) { next(error); }
};

export const createPatientReferral = async (req, res, next) => {
  try {
    const id = await dbService.generateId('PR', 'patient_referrals');
    const { patientId, patientName, patientPhone, patientEmail, sourceId, referredToDoctorId, status, notes, treatmentPlanId, estimatedRevenue, actualRevenue } = req.body;

    const query = `
      INSERT INTO patient_referrals 
        (id, patient_id, patient_name, patient_phone, patient_email, source_id, referred_to_doctor_id, status, notes, treatment_plan_id, estimated_revenue, actual_revenue)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await dbService.query(query, [
      id, patientId || null, patientName, patientPhone || null, patientEmail || null,
      sourceId, referredToDoctorId || null, status || 'received', notes || null,
      treatmentPlanId || null, estimatedRevenue || 0, actualRevenue || 0
    ]);

    const referral = dbService.mapRows('patient_referrals', result.rows)[0];

    // Trigger Timeline Activity
    const actId = await dbService.generateId('RA', 'referral_activities');
    await dbService.query(
      `INSERT INTO referral_activities (id, referral_id, activity_type, description, actor_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [actId, id, 'acknowledgement', `Referral received for patient ${patientName}.`, req.user.username]
    );

    // Increment Total Referrals in Source
    await dbService.query(
      `UPDATE referral_sources SET total_referrals = total_referrals + 1 WHERE id = $1`,
      [sourceId]
    );

    emitReferralUpdate('REFERRAL_CREATED', referral);

    // Queue Welcome/Acknowledgement outreach via WhatsApp/Email to source
    const sourceRes = await dbService.query('SELECT * FROM referral_sources WHERE id = $1', [sourceId]);
    const source = dbService.mapRows('referral_sources', sourceRes.rows)[0];

    if (source && source.email) {
      sendEmailJob('email-referral-thanks', async () => {
        try {
          await emailService.sendBatch([{
            to: source.email,
            subject: `Thank you for referring ${patientName} to Siara Dental`,
            html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
              <h2>Dear ${source.contactName || source.name},</h2>
              <p>We sincerely appreciate you referring <strong>${patientName}</strong> to Siara Dental.</p>
              <p>Our clinical team has received the case details and will ensure the patient receives our finest care. We will keep you updated as their treatment plan progresses.</p>
              <br/>
              <p>Warm regards,</p>
              <p><strong>Siara Dental Clinic</strong></p>
            </div>`
          }]);
        } catch (err) { console.error('Failed to send thank-you email:', err); }
      });
    }

    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Create Patient Referral', details: `Registered patient referral: ${patientName}`, ip: req.ip
    });

    res.status(201).json(referral);
  } catch (error) { next(error); }
};

export const updatePatientReferral = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    // Fetch original referral state for transition auditing
    const originalRes = await dbService.query('SELECT * FROM patient_referrals WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) return res.status(404).json({ message: 'Patient referral not found' });
    const original = dbService.mapRows('patient_referrals', originalRes.rows)[0];

    const updates = [];
    const params = [id];
    let i = 2;

    const COLUMN_MAP = {
      patientId: 'patient_id', patient_id: 'patient_id',
      patientName: 'patient_name', patient_name: 'patient_name',
      patientPhone: 'patient_phone', patient_phone: 'patient_phone',
      patientEmail: 'patient_email', patient_email: 'patient_email',
      referredToDoctorId: 'referred_to_doctor_id', referred_to_doctor_id: 'referred_to_doctor_id',
      status: 'status', notes: 'notes',
      treatmentPlanId: 'treatment_plan_id', treatment_plan_id: 'treatment_plan_id',
      estimatedRevenue: 'estimated_revenue', estimated_revenue: 'estimated_revenue',
      actualRevenue: 'actual_revenue', actual_revenue: 'actual_revenue',
      conversionDate: 'conversion_date', conversion_date: 'conversion_date',
    };

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      updates.push(`${dbCol} = $${i}`);
      params.push(value);
      i++;
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const query = `UPDATE patient_referrals SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);
    const referral = dbService.mapRows('patient_referrals', result.rows)[0];

    // Status Transition Auditing
    if (fields.status && fields.status !== original.status) {
      const histId = await dbService.generateId('RSH', 'referral_status_history');
      await dbService.query(
        `INSERT INTO referral_status_history (id, referral_id, old_status, new_status, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [histId, id, original.status, fields.status, req.user.username]
      );

      const actId = await dbService.generateId('RA', 'referral_activities');
      await dbService.query(
        `INSERT INTO referral_activities (id, referral_id, activity_type, description, actor_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [actId, id, 'status_change', `Referral stage changed from "${original.status}" to "${fields.status}".`, req.user.username]
      );

      // Trigger automatic reward or commissions if status converted to Completed
      if (fields.status === 'completed' || fields.status === 'commission_released') {
        const sourceRes = await dbService.query('SELECT * FROM referral_sources WHERE id = $1', [referral.sourceId]);
        const source = dbService.mapRows('referral_sources', sourceRes.rows)[0];

        if (source) {
          // Update total revenue in source
          await dbService.query(
            `UPDATE referral_sources 
             SET total_revenue = total_revenue + $1, updated_at = NOW() 
             WHERE id = $2`,
            [Number(referral.actualRevenue || 0), referral.sourceId]
          );

          // Calculate Commission Payout
          let commissionAmount = 0;
          if (source.commissionType === 'percentage') {
            commissionAmount = (Number(referral.actualRevenue || 0) * Number(source.commissionValue || 0)) / 100;
          } else {
            commissionAmount = Number(source.commissionValue || 0);
          }

          if (commissionAmount > 0) {
            const comId = await dbService.generateId('RCM', 'referral_commissions');
            await dbService.query(
              `INSERT INTO referral_commissions (id, referral_id, source_id, commission_amount, status)
               VALUES ($1, $2, $3, $4, $5)`,
              [comId, id, referral.sourceId, commissionAmount, 'pending']
            );

            // Log activity
            const comActId = await dbService.generateId('RA', 'referral_activities');
            await dbService.query(
              `INSERT INTO referral_activities (id, referral_id, activity_type, description, actor_name)
               VALUES ($1, $2, $3, $4, $5)`,
              [comActId, id, 'commission_earned', `Commission of ₹${commissionAmount} calculated and marked as pending.`, 'System']
            );
          }

          // If patient referred, credit reward points
          if (source.type === 'patient' && referral.patientId) {
            const rewardId = await dbService.generateId('RR', 'referral_rewards');
            // Give 10% of revenue as loyalty reward points
            const rewardValue = Math.round((Number(referral.actualRevenue || 0) * 0.1));
            if (rewardValue > 0) {
              await dbService.query(
                `INSERT INTO referral_rewards (id, referral_id, patient_id, reward_type, reward_value, status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [rewardId, id, referral.patientId, 'points', rewardValue, 'available']
              );
            }
          }
        }
      }
    }

    emitReferralUpdate('REFERRAL_UPDATED', referral);
    res.json(referral);
  } catch (error) { next(error); }
};

export const deletePatientReferral = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch source ID to decrement referrals count
    const refRes = await dbService.query('SELECT source_id FROM patient_referrals WHERE id = $1', [id]);
    if (refRes.rows.length > 0) {
      const sourceId = refRes.rows[0].source_id;
      await dbService.query(
        'UPDATE referral_sources SET total_referrals = GREATEST(0, total_referrals - 1) WHERE id = $1',
        [sourceId]
      );
    }

    const result = await dbService.query(
      'UPDATE patient_referrals SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Patient referral not found' });

    emitReferralUpdate('REFERRAL_DELETED', { id });
    res.json({ message: 'Patient referral deleted successfully' });
  } catch (error) { next(error); }
};

// ==========================================
// 3. Referral Documents, Notes, & Timeline Activities
// ==========================================

export const getReferralActivities = async (req, res, next) => {
  try {
    const { id } = req.params; // Referral ID
    const result = await dbService.query(
      'SELECT * FROM referral_activities WHERE referral_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(dbService.mapRows('referral_activities', result.rows));
  } catch (error) { next(error); }
};

export const createReferralActivity = async (req, res, next) => {
  try {
    const { id } = req.params; // Referral ID
    const { activityType, description } = req.body;
    const actId = await dbService.generateId('RA', 'referral_activities');

    const result = await dbService.query(
      `INSERT INTO referral_activities (id, referral_id, activity_type, description, actor_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [actId, id, activityType, description, req.user.username]
    );

    res.status(201).json(dbService.mapRows('referral_activities', result.rows)[0]);
  } catch (error) { next(error); }
};

export const getReferralNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      'SELECT * FROM referral_notes WHERE referral_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(dbService.mapRows('referral_notes', result.rows));
  } catch (error) { next(error); }
};

export const createReferralNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const noteId = await dbService.generateId('RN', 'referral_notes');

    const result = await dbService.query(
      `INSERT INTO referral_notes (id, referral_id, author_name, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [noteId, id, req.user.username, content]
    );

    res.status(201).json(dbService.mapRows('referral_notes', result.rows)[0]);
  } catch (error) { next(error); }
};

export const getReferralDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      'SELECT * FROM referral_documents WHERE referral_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(dbService.mapRows('referral_documents', result.rows));
  } catch (error) { next(error); }
};

export const attachReferralDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, fileUrl, cloudinaryPublicId, fileType } = req.body;
    const docId = await dbService.generateId('RD', 'referral_documents');

    const result = await dbService.query(
      `INSERT INTO referral_documents (id, referral_id, name, file_url, cloudinary_public_id, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [docId, id, name, fileUrl, cloudinaryPublicId || null, fileType || 'document', req.user.username]
    );

    const doc = dbService.mapRows('referral_documents', result.rows)[0];

    // Trigger Timeline Activity
    const actId = await dbService.generateId('RA', 'referral_activities');
    await dbService.query(
      `INSERT INTO referral_activities (id, referral_id, activity_type, description, actor_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [actId, id, 'document_attached', `Document "${name}" attached by staff.`, req.user.username]
    );

    res.status(201).json(doc);
  } catch (error) { next(error); }
};

// ==========================================
// 4. Commission Ledger & Rewards Hub
// ==========================================

export const getReferralCommissions = async (req, res, next) => {
  try {
    const result = await dbService.query(
      `SELECT rc.*, pr.patient_name, rs.name as source_name, rs.contact_name as source_contact
       FROM referral_commissions rc
       JOIN patient_referrals pr ON rc.referral_id = pr.id
       JOIN referral_sources rs ON rc.source_id = rs.id
       ORDER BY rc.created_at DESC`
    );
    res.json(dbService.mapRows('referral_commissions', result.rows));
  } catch (error) { next(error); }
};

export const updateReferralCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    let releasedAt = null;
    let releasedBy = null;

    if (status === 'released') {
      releasedAt = new Date().toISOString();
      releasedBy = req.user.username;
    }

    const query = `
      UPDATE referral_commissions 
      SET status = $1, notes = COALESCE($2, notes), released_at = COALESCE($3, released_at), released_by = COALESCE($4, released_by), updated_at = NOW()
      WHERE id = $5 
      RETURNING *
    `;

    const result = await dbService.query(query, [status, notes || null, releasedAt, releasedBy, id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Commission record not found' });

    const commission = dbService.mapRows('referral_commissions', result.rows)[0];
    emitReferralUpdate('COMMISSION_UPDATED', commission);

    res.json(commission);
  } catch (error) { next(error); }
};

export const getReferralRewards = async (req, res, next) => {
  try {
    const result = await dbService.query(
      `SELECT rr.*, pr.patient_name, p.name as referrer_name
       FROM referral_rewards rr
       JOIN patient_referrals pr ON rr.referral_id = pr.id
       JOIN patients p ON rr.patient_id = p.id
       ORDER BY rr.created_at DESC`
    );
    res.json(dbService.mapRows('referral_rewards', result.rows));
  } catch (error) { next(error); }
};

export const redeemReferralReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query(
      `UPDATE referral_rewards 
       SET status = 'redeemed', redeemed_at = NOW() 
       WHERE id = $1 AND status = 'available' 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) return res.status(400).json({ message: 'Reward is not available or already redeemed' });

    const reward = dbService.mapRows('referral_rewards', result.rows)[0];
    emitReferralUpdate('REWARD_REDEEMED', reward);

    res.json(reward);
  } catch (error) { next(error); }
};

// ==========================================
// 5. High-Impact Referral Analytics
// ==========================================

export const getReferralAnalytics = async (req, res, next) => {
  try {
    // 1. Core KPIs
    const kpiRes = await dbService.query(`
      SELECT 
        COUNT(id) as total_leads,
        COUNT(CASE WHEN status IN ('completed', 'commission_released') THEN 1 END) as converted_cases,
        SUM(actual_revenue) as total_conversion_revenue,
        SUM(estimated_revenue) as pipeline_value
      FROM patient_referrals
      WHERE is_deleted = FALSE
    `);

    // 2. Leads by source type breakdown
    const typeRes = await dbService.query(`
      SELECT rs.type as source_type, COUNT(pr.id) as count, SUM(pr.actual_revenue) as revenue
      FROM patient_referrals pr
      JOIN referral_sources rs ON pr.source_id = rs.id
      WHERE pr.is_deleted = FALSE
      GROUP BY rs.type
      ORDER BY count DESC
    `);

    // 3. Top performing doctors / referral groups
    const topRes = await dbService.query(`
      SELECT rs.id, rs.name, rs.type, rs.total_referrals, rs.total_revenue
      FROM referral_sources rs
      WHERE rs.is_deleted = FALSE
      ORDER BY rs.total_revenue DESC, rs.total_referrals DESC
      LIMIT 5
    `);

    // 4. Monthly conversion trends (ROI tracking)
    const trendsRes = await dbService.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(id) as total,
        COUNT(CASE WHEN status IN ('completed', 'commission_released') THEN 1 END) as converted,
        SUM(actual_revenue) as revenue
      FROM patient_referrals
      WHERE is_deleted = FALSE
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `);

    res.json({
      kpis: kpiRes.rows[0],
      sourceBreakdown: typeRes.rows,
      topReferrers: topRes.rows,
      monthlyTrends: trendsRes.rows
    });
  } catch (error) { next(error); }
};
