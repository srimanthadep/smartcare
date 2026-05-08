import { aiService } from '../services/ai.service.js';
import { dbService } from '../services/db.service.js';

export const generatePrescription = async (req, res, next) => {
  try {
    const { patientId, context } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    const db = await dbService.read();
    const patient = db.patients.find(p => p.id === patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Prepare data for AI
    const aiPayload = {
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      allergies: patient.allergies,
      conditions: patient.conditions,
      currentMedications: patient.medications?.map(m => m.name),
      context: context
    };

    const draft = await aiService.generatePrescriptionDraft(aiPayload);

    res.json({ data: draft });
  } catch (error) {
    console.error('Error in generatePrescription controller:', error);
    next(error);
  }
};
