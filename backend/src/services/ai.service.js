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
Reason for Visit / Context: ${patientData.context || 'General checkup/routine dental work'}
Current Medications: ${patientData.currentMedications?.length ? patientData.currentMedications.join(', ') : 'None'}

Please generate a safe, appropriate dental prescription draft.`;

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
      // Import dbService dynamically to avoid circular dependency if any
      const { dbService } = await import('./db.service.js');
      console.log('Fetching clinic context for AI...');
      const contextData = await dbService.read();
      console.log('Context fetched successfully.');

      const systemPrompt = `You are "Siara AI", an advanced clinical assistant for Siara Dental Clinic. 
You have access to the following clinic data:
- Patients: ${contextData.patients.length} records
- Appointments: ${contextData.appointments.length} records
- Invoices: ${contextData.invoices.length} records
- Prescriptions: ${contextData.prescriptions.length} records

DATA CONTEXT:
${JSON.stringify({
  summary: {
    totalPatients: contextData.patients.length,
    todayAppointments: contextData.appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)).length,
    pendingInvoices: contextData.invoices.filter(i => i.status !== 'Paid').length
  },
  recentPatients: contextData.patients.slice(0, 5).map(p => ({ id: p.id, name: p.name, lastVisit: p.lastVisit })),
  recentAppointments: contextData.appointments.slice(0, 5).map(a => ({ id: a.id, patient: a.patientName, date: a.date, time: a.time, type: a.type }))
})}

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
