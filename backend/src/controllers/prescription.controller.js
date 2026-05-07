import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';

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
    res.status(201).json(prescription);
  } catch (error) {
    next(error);
  }
};
