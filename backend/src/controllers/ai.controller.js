import { aiService } from '../services/ai.service.js';
import { dbService } from '../services/db.service.js';

export const generatePrescription = async (req, res, next) => {
  try {
    const { patientId, context } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

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

export const chat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    console.log('AI Chat Request Received:', { message, historyCount: history?.length });

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await aiService.chat(message, history || []);
    res.json({ data: response });
  } catch (error) {
    next(error);
  }
};

export const generateTreatmentPlan = async (req, res, next) => {
  try {
    const { findings } = req.body;
    if (!findings) {
      return res.status(400).json({ message: 'Findings are required' });
    }
    const plan = await aiService.generateTreatmentPlan(findings);
    res.json({ data: plan });
  } catch (error) {
    next(error);
  }
};

export const refineNotes = async (req, res, next) => {
  try {
    const { rawNotes } = req.body;
    if (!rawNotes) {
      return res.status(400).json({ message: 'Notes are required' });
    }
    const refined = await aiService.refineClinicalNotes(rawNotes);
    res.json({ data: refined });
  } catch (error) {
    next(error);
  }
};
