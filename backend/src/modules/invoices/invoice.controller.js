import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';
import { sendEmailJob, sendWhatsAppJob } from '../../shared/queue/jobQueue.service.js';
import { emailService } from '../../shared/services/email.service.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { pdfService } from '../../shared/services/pdf.service.js';

export const getInvoices = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let query = `
      SELECT i.*, p.name as patient_name, p.phone as patient_phone
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      WHERE i.is_deleted = FALSE
    `;
    const params = [];

    if (patientId) {
      params.push(patientId);
      query += ` AND i.patient_id = $${params.length}`;
    }

    // H4: Pagination
    const limit = parseInt(req.query.limit) || 200;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    params.push(limit);
    query += ` ORDER BY i.date DESC, i.id DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;
    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('invoices', result.rows));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const id = await dbService.generateId('INV', 'invoices');
    const { patientId, patientName, date, items, total, status, paidAmount, payments } = req.body;
    const invDate = date || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO invoices (id, patient_id, date, items, total, status, paid_amount, payments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [id, patientId, invDate, JSON.stringify(items), total, status || 'Pending', paidAmount || 0, JSON.stringify(payments || [])];
    const result = await dbService.query(query, params);
    const invoice = dbService.mapRows('invoices', result.rows)[0];

    // Fetch patient and queue notifications
    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

    if (patient && patient.email) {
      sendEmailJob('email-invoice', () => emailService.sendInvoiceEmail(patient, invoice));
    }
    if (patient) {
      sendWhatsAppJob('wa-invoice', () => whatsappService.sendInvoice(patient, invoice));
    }

    emitEvent(SOCKET_EVENTS.INVOICE_UPDATED, invoice);
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    // Get old state
    const oldRes = await dbService.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const oldInvoice = oldRes.rows[0];

    const updates = [];
    const params = [id];
    let i = 2;

    // C4: Safe column mapping — only hardcoded strings ever reach SQL
    const COLUMN_MAP = {
      patientId: 'patient_id', patient_id: 'patient_id',
      date: 'date', items: 'items', total: 'total',
      status: 'status', paidAmount: 'paid_amount', paid_amount: 'paid_amount',
      payments: 'payments',
    };

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      updates.push(`${dbCol} = $${i}`);
      params.push(['items', 'payments'].includes(key) ? JSON.stringify(value) : value);
      i++;
    }

    const query = `UPDATE invoices SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);
    const invoice = dbService.mapRows('invoices', result.rows)[0];

    // Send payment confirmation if status changed to Paid (queued)
    if (oldInvoice.status !== 'Paid' && invoice.status === 'Paid') {
      const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
      const patient = dbService.mapRows('patients', patientRes.rows)[0];
      if (patient && patient.email) {
        sendEmailJob('email-invoice', () => emailService.sendInvoiceEmail(patient, invoice));
      }
      if (patient) {
        sendWhatsAppJob('wa-invoice', () => whatsappService.sendInvoice(patient, invoice));
      }
    }

    emitEvent(SOCKET_EVENTS.INVOICE_UPDATED, invoice);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.sub || null;
    await dbService.query('UPDATE invoices SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE id = $1', [id, actorId]);
    emitEvent(SOCKET_EVENTS.INVOICE_UPDATED, { id, deleted: true });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invRes = await dbService.query(`
      SELECT i.*, p.name as patient_name, p.phone as patient_phone, p.age, p.gender
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = $1
    `, [id]);
    
    if (invRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = dbService.mapRows('invoices', invRes.rows)[0];
    const patient = {
      id: invoice.patientId,
      name: invoice.patientName,
      phone: invoice.patientPhone,
      age: invoice.age,
      gender: invoice.gender
    };

    const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
