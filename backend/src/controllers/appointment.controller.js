import { dbService } from '../services/db.service.js';

export const getAppointments = async (req, res, next) => {
  try {
    const { date, type } = req.query;
    const db = await dbService.read();
    
    let items = db.appointments
      .filter(a => !date || a.date === date)
      .filter(a => !type || type === 'all' || a.type === type)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const db = await dbService.read();
    const appointment = {
      id: dbService.generateId('A', db.appointments.map(a => a.id)),
      ...req.body
    };
    db.appointments.push(appointment);
    await dbService.write(db);
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ message: 'Appointment not found' });
    
    db.appointments[index] = { ...db.appointments[index], ...req.body };
    await dbService.write(db);
    res.json(db.appointments[index]);
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await dbService.read();
    db.appointments = db.appointments.filter(a => a.id !== id);
    await dbService.write(db);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
