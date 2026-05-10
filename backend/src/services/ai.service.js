import { config } from '../config/env.js';

class AIService {
  constructor() {
    if (!config.MISTRAL_API_KEY) {
      console.warn('MISTRAL_API_KEY is not set. AI features will fail.');
    }
  }

  /**
   * Generates a prescription using Mistral AI API.
   * @param {Object} patientData - Details of the patient and context
   * @returns {Object} JSON response representing the prescription
   */
  async generatePrescriptionDraft(patientData) {
    if (!config.MISTRAL_API_KEY) {
      throw new Error('AI service is not configured. Missing MISTRAL_API_KEY.');
    }

    const systemPrompt = `You are a helpful AI Assistant for a Dentist. Your task is to suggest a prescription draft based on the patient's dental data, medical history, and current symptoms.
You must return the response in strict JSON format. Do not use markdown blocks for JSON, just output raw JSON.
The JSON must have this structure:
{
  "diagnosis": "Clinical diagnosis based on chief complaint",
  "medicines": [
    { "name": "Medicine Name", "dosage": "e.g., 500mg", "frequency": "e.g., BID (twice a day)", "duration": "e.g., 5 days" }
  ],
  "notes": "General advice, follow-up instructions, and precautions"
}

IMPORTANT RULES:
- Never exceed 5 medicines.
- Only suggest medicines appropriate for dental scenarios (e.g., painkillers, antibiotics for infections, anti-inflammatory, mouthwash).
- If the patient has allergies (e.g., Penicillin), DO NOT prescribe related medicines.
- The output MUST BE valid JSON and nothing else.`;

const userPrompt = `Patient Details:
Name: ${patientData.patientName || 'Unknown'}
Age: ${patientData.age || 'Unknown'}
Gender: ${patientData.gender || 'Unknown'}
Allergies: ${patientData.allergies?.length ? patientData.allergies.join(', ') : 'None known'}
Conditions: ${patientData.conditions?.length ? patientData.conditions.join(', ') : 'None known'}
Chief Complaint / Reason for Visit: ${patientData.context || 'General checkup'}
Current Medications: ${patientData.currentMedications?.length ? patientData.currentMedications.join(', ') : 'None'}

Please generate a clinical diagnosis and an appropriate dental prescription draft based on the above complaint.`;

    try {
      console.log('Generating AI Prescription Draft...');
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'open-mistral-7b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Mistral API Error Details:', errorData);
        throw new Error(`Mistral API error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content;
      
      const parsedJSON = JSON.parse(responseText);
      
      // Basic validation
      if (!parsedJSON.medicines || !Array.isArray(parsedJSON.medicines)) {
        throw new Error('Invalid JSON structure from AI');
      }

      return parsedJSON;
    } catch (error) {
      console.error('Detailed AI Generation Error (Mistral):', error);
      throw new Error('Failed to generate prescription from AI. Please try again or write manually.');
    }
  }

  /**
   * General purpose chat with full clinical context.
   * @param {string} message - User message
   * @param {Array} history - Previous messages
   * @returns {string} AI response
   */
  async chat(message, history = []) {
    if (!config.MISTRAL_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    try {
      const { dbService } = await import('./db.service.js');
      console.log('Fetching optimized clinic context for AI...');
      
      const today = new Date().toISOString().slice(0, 10);
      
      const [patientCount, apptCount, invoiceCount, recentAppts, recentPatients] = await Promise.all([
        dbService.query('SELECT COUNT(*) FROM patients'),
        dbService.query('SELECT COUNT(*) FROM appointments WHERE date = $1', [today]),
        dbService.query('SELECT COUNT(*) FROM invoices WHERE status != $1', ['Paid']),
        dbService.query('SELECT id, patient_id, doctor_name, date, time, type FROM appointments ORDER BY created_at DESC LIMIT 5'),
        dbService.query('SELECT id, name, status FROM patients ORDER BY created_at DESC LIMIT 5')
      ]);

      const summary = {
        totalPatients: parseInt(patientCount.rows[0].count),
        todayAppointments: parseInt(apptCount.rows[0].count),
        pendingInvoices: parseInt(invoiceCount.rows[0].count),
        recentPatients: recentPatients.rows.map(r => ({ id: r.id, name: r.name, status: r.status })),
        recentAppointments: recentAppts.rows.map(r => ({ id: r.id, patientId: r.patient_id, doctor: r.doctor_name, date: r.date, time: r.time, type: r.type }))
      };

      const systemPrompt = `You are "Siara AI", an advanced clinical assistant for Siara Dental Clinic. 
You have access to the following clinic summary:
- Total Patients: ${summary.totalPatients}
- Appointments Today: ${summary.todayAppointments}
- Pending Invoices: ${summary.pendingInvoices}

RECENT ACTIVITY:
${JSON.stringify(summary, null, 2)}

YOUR ROLE:
1. Answer questions about clinic operations, patient statistics, and schedule.
2. Provide general dental health advice based on professional standards.
3. Help the dentist find information about specific patients if asked.
4. Be professional, concise, and helpful. 

If asked about medical advice, always add a disclaimer that this is an AI suggestion and the final clinical decision rests with Dr. Saikiran.
Response format: Markdown.`;

      console.log('System Prompt Length:', systemPrompt.length);
      console.log('History Count:', history.length);
      console.log('Calling Mistral API...');
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'open-mistral-7b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
          ],
          temperature: 0.7
        })
      });

      console.log('Mistral API Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Mistral Chat API Error Details:', errorData);
        throw new Error(`Mistral API error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Mistral API response received.');
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Detailed AI Chat Error:', error);
      throw new Error('Failed to get a response from Siara AI.');
    }
  }
}

export const aiService = new AIService();
