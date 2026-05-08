import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';
import { emailService } from '../services/email.service.js';

export const getPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const db = await dbService.read();
    const items = patientId 
      ? db.prescriptions.filter(p => p.patientId === patientId)
      : db.prescriptions;
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const createPrescription = async (req, res, next) => {
  try {
    const db = await dbService.read();
    const prescription = {
      id: dbService.generateId('RX', db.prescriptions.map(p => p.id)),
      ...req.body,
      date: req.body.date || new Date().toISOString().slice(0, 10)
    };
    db.prescriptions.unshift(prescription);
    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Create Prescription', `Created prescription for patient ${prescription.patientName}`, req.ip);
    
    // Send prescription email
    const patient = db.patients.find(p => p.id === prescription.patientId);
    if (patient && patient.email) {
      console.log(`🚀 Triggering automatic prescription email for ${patient.email}`);
      emailService.sendPrescriptionEmail(patient, prescription)
        .then(data => console.log(`✅ Automatic prescription email success: ${data?.id || 'OK'}`))
        .catch(err => console.error('❌ Automatic prescription email failed:', err));
    }
    
    res.status(201).json(prescription);
  } catch (error) {
    next(error);
  }
};

export const updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const index = db.prescriptions.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    db.prescriptions[index] = { ...db.prescriptions[index], ...req.body };
    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Update Prescription', `Updated prescription ${id}`, req.ip);
    res.json(db.prescriptions[index]);
  } catch (error) {
    next(error);
  }
};

export const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const initialLength = db.prescriptions.length;
    db.prescriptions = db.prescriptions.filter(p => p.id !== id);
    if (db.prescriptions.length === initialLength) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Delete Prescription', `Deleted prescription ${id}`, req.ip);
    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    next(error);
  }
};
