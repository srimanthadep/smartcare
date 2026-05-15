import { config } from '../config/env.js';

class AIService {
  constructor() {
    if (!config.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. AI features will fail.');
    }
  }

  /**
   * Generates a prescription using Gemini AI API.
   */
  async generatePrescriptionDraft(patientData) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured. Missing GEMINI_API_KEY.');
    }

    const systemPrompt = `You are a helpful AI Assistant for a Dentist. Your task is to suggest a prescription draft based on the patient's dental data, medical history, and current symptoms.
You must return the response in strict JSON format.
The JSON must have this structure:
{
  "diagnosis": "Clinical diagnosis based on chief complaint (Must be a single string, not an object)",
  "medicines": [
    { "name": "Medicine Name", "dosage": "e.g., 500mg", "frequency": "e.g., BID (twice a day)", "duration": "e.g., 5 days" }
  ],
  "notes": "General advice, follow-up instructions, and precautions"
}

IMPORTANT RULES:
- Never exceed 5 medicines.
- Only suggest medicines appropriate for dental scenarios.
- If the patient has allergies (e.g., Penicillin), DO NOT prescribe related medicines.
- The output MUST BE valid JSON.`;

    const userPrompt = `Patient Details:
Name: ${patientData.patientName || 'Unknown'}
Age: ${patientData.age || 'Unknown'}
Gender: ${patientData.gender || 'Unknown'}
Allergies: ${patientData.allergies?.length ? patientData.allergies.join(', ') : 'None known'}
Conditions: ${patientData.conditions?.length ? patientData.conditions.join(', ') : 'None known'}
Chief Complaint / Reason for Visit: ${patientData.context || 'General checkup'}
Current Medications: ${patientData.currentMedications?.length ? patientData.currentMedications.join(', ') : 'None'}`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      console.log('Generating AI Prescription Draft via Gemini...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error Details:', errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      const parsedJSON = JSON.parse(responseText);
      
      if (!parsedJSON.medicines || !Array.isArray(parsedJSON.medicines)) {
        throw new Error('Invalid JSON structure from AI');
      }

      return parsedJSON;
    } catch (error) {
      console.error('Detailed AI Generation Error (Gemini):', error);
      throw new Error('Failed to generate prescription from AI. Please try again or write manually.');
    }
  }

  /**
   * General purpose chat with full clinical context.
   */
  async chat(message, history = []) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    try {
      const { dbService } = await import('./db.service.js');
      console.log('Fetching optimized clinic context for Gemini AI...');
      
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
${JSON.stringify(summary, null, 2)}

YOUR ROLE:
1. Answer questions about clinic operations, patient statistics, and schedule.
2. Provide general dental health advice based on professional standards.
3. Help the dentist find information about specific patients if asked.
4. Be professional, concise, and helpful. 

Disclaimer: Add a note that this is an AI suggestion and the final clinical decision rests with Dr. Saikiran.`;

      // Convert history to Gemini format
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Add system prompt as a user message if it's the first turn, or prepend it.
      // Better: Use system_instruction if supported, or just prepend to the first message.
      const fullContents = [
        { role: 'user', parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }] },
        ...contents,
        { role: 'user', parts: [{ text: message }] }
      ];

      console.log('Calling Gemini API for chat...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: fullContents,
          generationConfig: {
            temperature: 0.7,
            max_output_tokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini Chat API Error Details:', errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Detailed AI Chat Error (Gemini):', error);
      throw new Error('Failed to get a response from Siara AI.');
    }
  }

  /**
   * Generates a structured treatment plan based on clinical findings.
   */
  async generateTreatmentPlan(findings) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    const systemPrompt = `You are an expert Treatment Planning Assistant for a Dentist. 
Given the clinical findings, suggest a multi-phase treatment plan.
You must return the response in strict JSON format.
Structure:
{
  "title": "Short title for the plan",
  "phases": [
    {
      "name": "Phase Name (e.g., Phase 1: Urgent Care)",
      "items": ["Procedure 1", "Procedure 2"],
      "estimatedCost": "Approx cost in INR",
      "duration": "e.g., 1 visit, 2 weeks"
    }
  ],
  "totalEstimatedCost": "Total INR",
  "notes": "Advice for the patient"
}
Output raw JSON only.`;

    const fullPrompt = `${systemPrompt}\n\nClinical Findings: ${findings}`;

    try {
      console.log('Generating AI Treatment Plan via Gemini...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('AI Treatment Plan Error:', error);
      throw new Error('Failed to generate treatment plan.');
    }
  }

  /**
   * Cleans up messy clinical notes/transcripts into professional structure.
   */
  async refineClinicalNotes(rawNotes) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    const systemPrompt = `You are a Clinical Documentation Specialist. 
Convert the following messy, spoken-style clinical notes into a professional, structured dental clinical note.
Format:
- Chief Complaint
- Observations
- Procedure Performed
- Advice & Next Steps`;

    const fullPrompt = `${systemPrompt}\n\nRaw Notes: ${rawNotes}`;

    try {
      console.log('Refining Clinical Notes via Gemini...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI Note Refinement Error:', error);
      throw new Error('Failed to refine notes.');
    }
  }

  /**
   * Automatically categorizes an expense based on its name.
   */
  async autoCategorizeExpense(expenseName) {
    if (!config.GEMINI_API_KEY) return 'Other';

    const systemPrompt = `You are a clinic management assistant. Categorize the following expense name into one of these categories:
    Rent, Salaries, Medicine Supplies, Equipment, Utility Bills, Marketing, Other.
    Return ONLY the category name.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nExpense Name: ${expenseName}` }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) return 'Other';
      const data = await response.json();
      const category = data.candidates[0].content.parts[0].text.trim();
      
      const CATEGORIES = ["Rent", "Salaries", "Medicine Supplies", "Equipment", "Utility Bills", "Marketing", "Other"];
      return CATEGORIES.includes(category) ? category : 'Other';
    } catch (error) {
      return 'Other';
    }
  }

  /**
   * Analyzes a dental X-ray image using Gemini Vision.
   */
  async analyzeXray(imageUrl, patientContext = {}) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    try {
      // 1. Fetch image and convert to base64
      console.log(`Fetching X-ray for AI analysis: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error('Failed to fetch image for analysis');
      
      const buffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      const systemPrompt = `You are an expert Dental Radiologist assistant. 
Analyze this dental X-ray and provide clinical insights.
Patient Context: ${JSON.stringify(patientContext)}

You must return the response in strict JSON format.
Structure:
{
  "findings": ["Point 1", "Point 2"],
  "diagnosis": "Overall clinical impression",
  "affectedTeeth": [36, 47],
  "confidence": 0.95,
  "recommendations": ["Next step 1", "Next step 2"],
  "disclaimer": "This is an AI-assisted analysis for review by Dr. Saikiran only."
}

CRITICAL: 
- Be specific about caries, bone loss, periapical radiolucency, or restorations.
- If the image is not a dental X-ray, state "Invalid Image" in findings.
- Use FDI tooth numbering system (11-48).`;

      console.log('Sending X-ray to Gemini for analysis...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini Vision API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('X-Ray Analysis Error:', error);
      throw new Error(`Failed to analyze X-ray: ${error.message}`);
    }
  }
}

export const aiService = new AIService();
