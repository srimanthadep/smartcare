import { dbService } from '../services/db.service.js';

export const getDoctors = async (req, res, next) => {
  try {
    const result = await dbService.query('SELECT * FROM doctors');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization, department, phone, email } = req.body;
    const id = await dbService.generateId('D', 'doctors');
    
    const result = await dbService.query(
      'INSERT INTO doctors (id, name, specialization, department, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, name, specialization, department, phone, email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, specialization, department, phone, email } = req.body;
    
    const result = await dbService.query(
      'UPDATE doctors SET name = $1, specialization = $2, department = $3, phone = $4, email = $5 WHERE id = $6 RETURNING *',
      [name, specialization, department, phone, email, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query('DELETE FROM doctors WHERE id = $1', [id]);
    res.json({ message: 'Doctor deleted' });
  } catch (error) {
    next(error);
  }
};
