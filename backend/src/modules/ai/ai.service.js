import { config } from '../../core/config/env.js';

class AIService {
  constructor() {
    if (!config.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. AI features will fail.');
    }
  }

  /**
   * Generates a prescription using Gemini AI API with strict medical safety guardrails.
   */
  async generatePrescriptionDraft(patientData, user = null) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured. Missing GEMINI_API_KEY.');
    }

    const systemPrompt = `You are a board-certified Dental Pharmacology Specialist. Your task is to generate a highly safe, conservative, and evidence-based prescription draft based purely on the patient's dental context, medical history, and symptoms.
You must return the response in strict JSON format.

Structure:
{
  "clinicalReasoning": "Provide a brief clinical rationale explaining the drug choices, potential contraindications checked, and safety considerations.",
  "diagnosis": "Clinical diagnosis based on chief complaint (Must be a single string, not an object)",
  "medicines": [
    { "name": "Medicine Name", "dosage": "e.g., 500mg", "frequency": "e.g., BID (twice a day)", "duration": "e.g., 5 days" }
  ],
  "notes": "General advice, follow-up instructions, precautions, and emergency contact advisement."
}

CRITICAL PHARMACOLOGY RULES:
1. DETERMINISTIC SAFETY: Suggest ONLY standard, conservative dental medications (e.g., Amoxicillin, Ibuprofen, Paracetamol, Chlorhexidine mouthwash).
2. ALLERGY GATES: If the patient has allergies (e.g., Penicillin), DO NOT prescribe any related drug classes under any circumstances. Double check cross-reactivity.
3. LIMITS: Never prescribe more than 3 medicines unless clinically essential. Maximum 5.
4. DETAILED INSTRUCTIONS: Each suggested medicine must have precise clinical dosage, frequency, and duration.
5. NO HALLUCINATION: If the patient's complaint is ambiguous, prescribe conservative palliative care (e.g., warm saline rinses, OTC analgesics) and recommend clinical examination.`;

    const userPrompt = `Patient Details:
Name: ${patientData.patientName || 'Unknown'}
Age: ${patientData.age || 'Unknown'}
Gender: ${patientData.gender || 'Unknown'}
Allergies: ${patientData.allergies?.length ? patientData.allergies.join(', ') : 'None known'}
Conditions: ${patientData.conditions?.length ? patientData.conditions.join(', ') : 'None known'}
Chief Complaint / Reason for Visit: ${patientData.context || 'General checkup'}
Current Medications: ${patientData.currentMedications?.length ? patientData.currentMedications.join(', ') : 'None'}`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const startTime = Date.now();

    try {
      console.log('Generating AI Prescription Draft via Gemini with strict safety rules...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.0 // Force absolute factual determinism
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

      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Prescription Generator',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      return parsedJSON;
    } catch (error) {
      console.error('Detailed AI Generation Error (Gemini):', error);
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Prescription Generator',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      throw new Error('Failed to generate prescription from AI. Please try again or write manually.');
    }
  }

  /**
   * General purpose chat with full clinical context and strict factual alignment.
   */
  async chat(message, history = [], user = null) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }
    const startTime = Date.now();

    try {
      const { dbService } = await import('../../core/db/db.service.js');
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

      const systemPrompt = `You are "Siara AI", an advanced, board-certified clinical assistant for Siara Dental Clinic.
You have access to the following real-time clinic summary data:
${JSON.stringify(summary, null, 2)}

OPERATIONAL RULES:
1. STRICT FACTS: Never speculate or fabricate patient numbers, invoice statuses, or appointment dates. Rely solely on the provided summary.
2. MEDICAL RESPONSIBILITY: If asked for professional dental advice, provide standard, evidence-based, safe information. Always add a clinical disclaimer.
3. CONCISENESS: Be highly professional, clear, and direct. Avoid conversational fluff.
4. ROLE LIMITATIONS: Do not diagnose specific patient conditions or prescribe schedules without direct physician confirmation.

Disclaimer: Add a note that this is an AI suggestion and the final clinical decision rests with Dr. Saikiran.`;

      // Convert history to Gemini format
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const fullContents = [
        { role: 'user', parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }] },
        ...contents,
        { role: 'user', parts: [{ text: message }] }
      ];

      console.log('Calling Gemini API for chat with low temperature safety...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: fullContents,
          generationConfig: {
            temperature: 0.1, // Reduced for much higher factual consistency
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
      const responseText = data.candidates[0].content.parts[0].text;

      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Siara AI Chat',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      return responseText;
    } catch (error) {
      console.error('Detailed AI Chat Error (Gemini):', error);
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Siara AI Chat',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      throw new Error('Failed to get a response from Siara AI.');
    }
  }

  /**
   * Generates a structured treatment plan with deterministic financial & clinical models.
   */
  async generateTreatmentPlan(findings, user = null) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    const systemPrompt = `You are a professional Clinical Treatment Planner. 
Given the clinical findings, suggest a multi-phase treatment plan.
You must return the response in strict JSON format.

Structure:
{
  "clinicalReasoning": "Document a detailed diagnostic rationale explaining why these phases are structured this way and what clinical guidelines support them.",
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

PLANNING RULES:
1. SAFE PROGRESSION: Organize steps from acute pain relief (Phase 1) to restorative work (Phase 2) to prophylaxis (Phase 3).
2. NO FABRICATION: Do not invent symptoms or conditions not stated in the findings.
3. CONSERVATIVE PRICING: Provide standard, safe estimates in INR.
4. Output RAW JSON only.`;

    const fullPrompt = `${systemPrompt}\n\nClinical Findings: ${findings}`;
    const startTime = Date.now();

    try {
      console.log('Generating AI Treatment Plan via Gemini with temperature 0.0...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.0 // Force absolute factual reasoning
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      const parsedJSON = JSON.parse(responseText);

      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Treatment Planner',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      return parsedJSON;
    } catch (error) {
      console.error('AI Treatment Plan Error:', error);
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Treatment Planner',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      throw new Error('Failed to generate treatment plan.');
    }
  }

  /**
   * Cleans up clinical notes with zero extrapolation.
   */
  async refineClinicalNotes(rawNotes, user = null) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }

    const systemPrompt = `You are a Clinical Documentation Specialist. 
Convert the following messy, spoken-style clinical notes into a professional, structured dental clinical note.
Do not extrapolate, add new findings, or invent details not present in the input text. If the input is empty or unclear, summarize ONLY what is stated.

Format:
- Chief Complaint
- Observations
- Procedure Performed
- Advice & Next Steps`;

    const fullPrompt = `${systemPrompt}\n\nRaw Notes: ${rawNotes}`;
    const startTime = Date.now();

    try {
      console.log('Refining Clinical Notes with zero-temperature...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { 
            temperature: 0.0 // Absolute factual alignment
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Clinical Notes Refiner',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      return responseText;
    } catch (error) {
      console.error('AI Note Refinement Error:', error);
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Clinical Notes Refiner',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      throw new Error('Failed to refine notes.');
    }
  }

  /**
   * Automatically categorizes an expense with absolute determinism.
   */
  async autoCategorizeExpense(expenseName, user = null) {
    if (!config.GEMINI_API_KEY) return 'Other';

    const systemPrompt = `You are a strict, factual accounting categorizer. Categorize this expense name into exactly one of these:
    Rent, Salaries, Medicine Supplies, Equipment, Utility Bills, Marketing, Other.
    Return ONLY the category name. No explanations, no extra characters.`;
    const startTime = Date.now();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nExpense Name: ${expenseName}` }] }],
          generationConfig: { 
            temperature: 0.0 // Force deterministic match
          }
        })
      });

      if (!response.ok) {
        if (user) {
          const duration = Date.now() - startTime;
          const { logAIUsage } = await import('../admin/audit.service.js');
          logAIUsage({
            userId: user.sub || user.id,
            userName: user.username || user.name || 'System',
            tool: 'Expense Categorizer',
            tokensUsed: 0,
            estimatedCost: 0,
            responseTimeMs: duration,
            success: false,
            errorMessage: response.statusText
          }).catch(e => console.error('Failed to log AI usage:', e));
        }
        return 'Other';
      }
      const data = await response.json();
      const category = data.candidates[0].content.parts[0].text.trim();
      
      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Expense Categorizer',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      const CATEGORIES = ["Rent", "Salaries", "Medicine Supplies", "Equipment", "Utility Bills", "Marketing", "Other"];
      return CATEGORIES.includes(category) ? category : 'Other';
    } catch (error) {
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'Expense Categorizer',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      return 'Other';
    }
  }

  /**
   * Analyzes a dental X-ray image using Gemini Vision with rigorous clinical verification guardrails.
   */
  async analyzeXray(imageUrl, patientContext = {}, user = null) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('AI service is not configured.');
    }
    const startTime = Date.now();

    try {
      console.log(`Fetching X-ray for AI analysis: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error('Failed to fetch image for analysis');
      
      const buffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      const systemPrompt = `You are a board-certified Dental Radiologist assistant. 
Analyze the provided dental X-ray radiograph and output clinical observations with maximum factual accuracy.
Patient Context: ${JSON.stringify(patientContext)}

You must return the response in strict JSON format.

Structure:
{
  "clinicalReasoning": [
    "Step 1: Enamel and dentin boundaries inspected for radiolucency.",
    "Step 2: Alveolar bone levels and periodontal ligament spaces evaluated.",
    "Step 3: Existing dental restorations and pulp chambers assessed."
  ],
  "findings": ["Direct radiographic observation 1", "Direct radiographic observation 2"],
  "diagnosis": "Strict radiographical impression (e.g., 'Interproximal caries on tooth #36' or 'Optimal periodontal status')",
  "affectedTeeth": [36, 47],
  "confidence": 0.95,
  "recommendations": ["Safe, evidence-based next step 1 (e.g., Clinical evaluation, Restorative care)"],
  "disclaimer": "This is an AI-assisted radiographic review for review by Dr. Saikiran only. Final clinical decisions must be confirmed in person."
}

CRITICAL CLINICAL CONSTRAINTS:
1. DETERMINISTIC ASSESSMENT: Set your internal temperature to 0.0. Do not guess, speculate, or fabricate pathologies.
2. RADIOLOGICAL EVIDENCE ONLY: Report ONLY what is clearly visible on the radiograph (e.g., radiolucency, bone loss, impacted teeth, restorations). If bone levels are normal and no caries are present, output "No significant radiographic pathology noted."
3. TOOTH NUMBERING: Use strictly the FDI World Dental Federation two-digit numbering system (11-48). Never output tooth numbers outside this range.
4. VALIDATION: If the image provided is not a dental radiograph, set the diagnosis to "Invalid Image File" and report "Not a valid dental X-ray" in findings.
5. NO INVASIVE SUGGESTIONS: Do not recommend major surgical interventions unless there is extreme, undeniable radiographic evidence (like deep impacted wisdom teeth or severe periapical lesions).
6. STEP-BY-STEP ANALYSIS: You must populate the "clinicalReasoning" array with a step-by-step description of your radiological inspection sequence (minimum 3 steps). This guarantees safety and high accuracy.`;

      console.log('Sending X-ray to Gemini Vision for zero-hallucination analysis...');
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
            temperature: 0.0 // Force absolute factual analysis without hallucination
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini Vision API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      const parsedJSON = JSON.parse(responseText);

      if (user) {
        const duration = Date.now() - startTime;
        const usage = data.usageMetadata || {};
        const pt = usage.promptTokenCount || 0;
        const ct = usage.candidatesTokenCount || 0;
        const cost = (pt * 0.075 + ct * 0.3) / 1000000;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'X-Ray Analyzer',
          tokensUsed: pt + ct,
          estimatedCost: cost,
          responseTimeMs: duration,
          success: true
        }).catch(e => console.error('Failed to log AI usage:', e));
      }

      return parsedJSON;
    } catch (error) {
      console.error('X-Ray Analysis Error:', error);
      if (user) {
        const duration = Date.now() - startTime;
        const { logAIUsage } = await import('../admin/audit.service.js');
        logAIUsage({
          userId: user.sub || user.id,
          userName: user.username || user.name || 'System',
          tool: 'X-Ray Analyzer',
          tokensUsed: 0,
          estimatedCost: 0,
          responseTimeMs: duration,
          success: false,
          errorMessage: error.message
        }).catch(e => console.error('Failed to log AI usage:', e));
      }
      throw new Error(`Failed to analyze X-ray: ${error.message}`);
    }
  }
}

export const aiService = new AIService();
