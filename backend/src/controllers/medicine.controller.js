import { medicineService } from '../services/medicine.service.js';
import { dbService } from '../services/db.service.js';

export const searchMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    // 1. Search personalized saved medicines
    const savedQuery = `
      SELECT id, name as brand_name, dose as strength, frequency, duration
      FROM saved_medicines
      WHERE name ILIKE $1 AND is_deleted = FALSE
      ORDER BY updated_at DESC
      LIMIT 5
    `;
    const savedRes = await dbService.query(savedQuery, [`%${q.trim()}%`]);
    const savedMedicines = savedRes.rows.map(row => ({
      id: `saved_${row.id}`,
      brand_name: row.brand_name,
      strength: row.strength,
      dose: row.strength, // maps back to strength in UI
      frequency: row.frequency,
      duration: row.duration,
      is_saved: true
    }));

    // 2. Search generic database
    let genericResults = medicineService.search(q) || [];

    // Filter out generic results that exactly match a saved medicine to avoid duplicates
    const savedNames = new Set(savedMedicines.map(s => s.brand_name.toLowerCase()));
    genericResults = genericResults.filter(g => !savedNames.has(g.brand_name.toLowerCase()));

    // Combine results, prioritizing saved medicines
    const results = [...savedMedicines, ...genericResults];
    
    res.json(results);
  } catch (error) {
    next(error);
  }
};
