import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';
import { emailService } from '../services/email.service.js';

export const getPatients = async (req, res, next) => {
  try {
    const db = await dbService.read();
    const { search, status, gender, from, to } = req.query;

    let items = db.patients;

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s));
    }
    if (status && status !== 'all') items = items.filter(p => p.status === status);
    if (gender && gender !== 'all') items = items.filter(p => p.gender === gender);
    if (from) items = items.filter(p => p.registeredOn >= from);
    if (to) items = items.filter(p => p.registeredOn <= to);

    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const patient = db.patients.find(p => p.id === id);

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    res.json({
      patient,
      diagnoses: db.diagnoses.filter(d => d.patientId === id),
      reports: db.reports.filter(r => r.patientId === id)
    });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const db = await dbService.read();
    const patient = {
      id: dbService.generateId('P', db.patients.map(p => p.id)),
      ...req.body,
      registeredOn: req.body.registeredOn || new Date().toISOString().slice(0, 10)
    };

    db.patients.unshift(patient);
    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Create Patient', `Created patient ${patient.name} (${patient.id})`, req.ip);
    
    // Send welcome email
    if (patient.email) {
      console.log(`🚀 Triggering automatic welcome email for ${patient.email}`);
      emailService.sendWelcomeEmail(patient)
        .then(data => console.log(`✅ Automatic welcome email success: ${data?.id || 'OK'}`))
        .catch(err => console.error('❌ Automatic welcome email failed:', err));
    } else {
      console.log('ℹ️ No email provided for patient, skipping welcome email.');
    }

    // Auto-create Consultation Fee Invoice
    const consultationFee = req.body.consultationFee || 300;
    const invoice = {
      id: dbService.generateId('INV', db.invoices.map(i => i.id)),
      patientId: patient.id,
      patientName: patient.name,
      date: new Date().toISOString().slice(0, 10),
      items: [
        {
          description: "Consultation Fee",
          amount: consultationFee
        }
      ],
      total: consultationFee,
      status: "Pending"
    };

    db.invoices.unshift(invoice);
    await dbService.write(db);
    console.log(`💰 Automatic consultation invoice created for ${patient.name}: ${invoice.id}`);

    // Send invoice email
    if (patient.email) {
      emailService.sendInvoiceEmail(patient, invoice)
        .then(data => console.log(`✅ Automatic invoice email success: ${data?.id || 'OK'}`))
        .catch(err => console.error('❌ Automatic invoice email failed:', err));
    }
    
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const index = db.patients.findIndex(p => p.id === id);

    if (index === -1) return res.status(404).json({ message: 'Patient not found' });

    db.patients[index] = { ...db.patients[index], ...req.body };
    await dbService.write(db);
    
    res.json(db.patients[index]);
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const index = db.patients.findIndex(p => p.id === id);

    if (index === -1) return res.status(404).json({ message: 'Patient not found' });

    const patientName = db.patients[index].name;
    db.patients.splice(index, 1);
    
    // Also cleanup related data if needed
    db.appointments = db.appointments.filter(a => a.patientId !== id);
    db.diagnoses = db.diagnoses.filter(d => d.patientId !== id);
    db.invoices = db.invoices.filter(i => i.patientId !== id);
    db.prescriptions = db.prescriptions.filter(p => p.patientId !== id);

    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Delete Patient', `Deleted patient ${patientName} (${id})`, req.ip);

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    next(error);
  }
};
