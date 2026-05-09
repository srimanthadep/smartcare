import { dbService } from '../services/db.service.js';
import { emailService } from '../services/email.service.js';
import { emitEvent, SOCKET_EVENTS } from '../services/socket.service.js';

export const getInvoices = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (patientId) {
      params.push(patientId);
      query += ` AND patient_id = $${params.length}`;
    }

    query += ' ORDER BY date DESC';
    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('invoices', result.rows));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const id = await dbService.generateId('INV', 'invoices');
    const { patientId, patientName, date, items, total, status } = req.body;
    const invDate = date || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO invoices (id, patient_id, date, items, total, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [id, patientId, invDate, JSON.stringify(items), total, status || 'Pending'];
    const result = await dbService.query(query, params);
    const invoice = dbService.mapRows('invoices', result.rows)[0];

    // Send invoice email
    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

    if (patient && patient.email) {
      emailService.sendInvoiceEmail(patient, invoice).catch(err => console.error('Invoice email failed:', err));
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

    const mapping = { patientId: 'patient_id' };

    const ALLOWED_COLUMNS = ['patient_id', 'date', 'items', 'total', 'status'];

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = mapping[key] || key;
      if (!ALLOWED_COLUMNS.includes(dbKey)) continue;

      updates.push(`${dbKey} = $${i}`);
      params.push(key === 'items' ? JSON.stringify(value) : value);
      i++;
    }

    const query = `UPDATE invoices SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);
    const invoice = dbService.mapRows('invoices', result.rows)[0];

    // Send payment confirmation email if status changed to Paid
    if (oldInvoice.status !== 'Paid' && invoice.status === 'Paid') {
      const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
      const patient = dbService.mapRows('patients', patientRes.rows)[0];
      if (patient && patient.email) {
        emailService.sendInvoiceEmail(patient, invoice).catch(err => console.error('Email error:', err));
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
    await dbService.query('DELETE FROM invoices WHERE id = $1', [id]);
    emitEvent(SOCKET_EVENTS.INVOICE_UPDATED, { id, deleted: true });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
