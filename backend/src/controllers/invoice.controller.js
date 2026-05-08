import { dbService } from '../services/db.service.js';
import { emailService } from '../services/email.service.js';

export const getInvoices = async (req, res, next) => {
  try {
    const db = await dbService.read();
    res.json(db.invoices.sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const db = await dbService.read();
    const invoice = {
      id: dbService.generateId('INV', db.invoices.map(i => i.id)),
      ...req.body,
      date: req.body.date || new Date().toISOString().slice(0, 10)
    };
    db.invoices.unshift(invoice);
    await dbService.write(db);

    // Send invoice email
    const patient = db.patients.find(p => p.id === invoice.patientId);
    if (patient && patient.email) {
      console.log(`🚀 Triggering automatic invoice email for ${patient.email}`);
      emailService.sendInvoiceEmail(patient, invoice)
        .then(data => console.log(`✅ Automatic invoice email success: ${data?.id || 'OK'}`))
        .catch(err => console.error('❌ Automatic invoice email failed:', err));
    }

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const index = db.invoices.findIndex(i => i.id === id);
    if (index === -1) return res.status(404).json({ message: 'Invoice not found' });
    
    const oldStatus = db.invoices[index].status;
    db.invoices[index] = { ...db.invoices[index], ...req.body };
    const newStatus = db.invoices[index].status;

    await dbService.write(db);

    // Send payment confirmation email if status changed to Paid
    if (oldStatus !== 'Paid' && newStatus === 'Paid') {
      const patient = db.patients.find(p => p.id === db.invoices[index].patientId);
      if (patient && patient.email) {
        emailService.sendInvoiceEmail(patient, db.invoices[index]).catch(err => console.error('Email error:', err));
      }
    }

    res.json(db.invoices[index]);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    db.invoices = db.invoices.filter(i => i.id !== id);
    await dbService.write(db);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
