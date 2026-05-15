import { medicineService } from '../services/medicine.service.js';
import { dbService } from '../services/db.service.js';

export const searchMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const queryStr = `%${q.trim()}%`;
    let savedMedicines = [];
    let clinicMedicines = [];

    // 1. Search personalized saved medicines (safely)
    try {
      const savedQuery = `
        SELECT id, name as brand_name, dose as strength, frequency, duration
        FROM saved_medicines
        WHERE (name ILIKE $1) AND is_deleted = FALSE
        ORDER BY updated_at DESC
        LIMIT 10
      `;
      const savedRes = await dbService.query(savedQuery, [queryStr]);
      savedMedicines = savedRes.rows.map(row => ({
        id: `saved_${row.id}`,
        brand_name: row.brand_name,
        strength: row.strength,
        dose: row.strength,
        frequency: row.frequency,
        duration: row.duration,
        is_saved: true
      }));
    } catch (e) {
      console.warn('saved_medicines table not available, skipping.');
    }

    // 2. Search clinic's general medicines table in Postgres (safely)
    try {
      const clinicQuery = `
        SELECT id, name, strength, form
        FROM medicines
        WHERE name ILIKE $1
        LIMIT 10
      `;
      const clinicRes = await dbService.query(clinicQuery, [queryStr]);
      clinicMedicines = clinicRes.rows.map(row => ({
        id: `clinic_${row.id}`,
        brand_name: row.name,
        strength: row.strength,
        dosage_form: row.form,
        is_clinic: true
      }));
    } catch (e) {
      console.warn('Postgres medicines table search failed, skipping.');
    }

    // 3. Search generic SQLite database (already safe)
    let genericResults = medicineService.search(q) || [];

    // Filter duplicates
    const seenNames = new Set(savedMedicines.map(s => s.brand_name.toLowerCase()));
    clinicMedicines.forEach(m => {
      if (!seenNames.has(m.brand_name.toLowerCase())) {
        seenNames.add(m.brand_name.toLowerCase());
      }
    });
    
    genericResults = genericResults.filter(g => !seenNames.has(g.brand_name.toLowerCase()));

    // Combine results
    const results = [...savedMedicines, ...clinicMedicines, ...genericResults];
    
    res.json(results);
  } catch (error) {
    console.error('Final medicine search error:', error);
    res.json([]); // Return empty rather than 500
  }
};
