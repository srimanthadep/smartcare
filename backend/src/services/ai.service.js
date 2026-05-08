import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

class AIService {
  constructor() {
    // The client gets the API key from the environment variable GEMINI_API_KEY
    // if initialized with {} or no arguments. But since we use our config, we pass it.
    if (config.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    } else {
      console.warn('GEMINI_API_KEY is not set. AI features will fail.');
      this.ai = null;
    }
  }

  /**
   * Generates a prescription using Gemini API.
   * @param {Object} patientData - Details of the patient and context
   * @returns {Object} JSON response representing the prescription
   */
  async generatePrescriptionDraft(patientData) {
    if (!this.ai) {
      throw new Error('AI service is not configured. Missing GEMINI_API_KEY.');
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
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash', // Use 2.5 flash for speed and reliability
        contents: systemPrompt + "\n\n" + userPrompt,
      });

      let responseText = response.text || '';
      
      // Clean up markdown block if model accidentally included it
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedJSON = JSON.parse(responseText);
      
      // Basic validation
      if (!parsedJSON.medicines || !Array.isArray(parsedJSON.medicines)) {
        throw new Error('Invalid JSON structure from AI');
      }

      return parsedJSON;
    } catch (error) {
      console.error('AI Generation Error:', error);
      
      // Fallback or attempt to parse again if it was a formatting error
      try {
        // Try to generate with a smaller flash model if pro failed or just throw
        const fallbackResponse = await this.ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: systemPrompt + "\n\n" + userPrompt,
        });
        let fallbackText = fallbackResponse.text || '';
        fallbackText = fallbackText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(fallbackText);
      } catch (fallbackError) {
        throw new Error('Failed to generate prescription from AI. Please try again or write manually.');
      }
    }
  }
}

export const aiService = new AIService();
