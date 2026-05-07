import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';

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
