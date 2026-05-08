import { medicineService } from '../services/medicine.service.js';

export const searchMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ data: [] });
    }

    const results = medicineService.search(q);
    
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
};
