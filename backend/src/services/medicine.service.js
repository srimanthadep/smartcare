import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../data/medicines.sqlite');

class MedicineService {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      try {
        if (!fs.existsSync(DB_FILE_PATH)) {
          return null;
        }
        this.db = new Database(DB_FILE_PATH, { fileMustExist: true });
        this.db.pragma('journal_mode = WAL');
      } catch (error) {
        console.error('Failed to open medicines database:', error);
        return null;
      }
    }
    return this.db;
  }

  /**
   * Search medicines using FTS5
   * @param {string} query Search string
   * @returns {Array} Array of matched medicines (max 10)
   */
  search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const db = this.getDb();
    if (!db) {
      return [];
    }
    
    // Clean and prepare query for FTS5 prefix matching
    // e.g., "para" -> "para*"
    // Escape quotes to prevent SQL syntax errors in FTS queries
    const safeQuery = query.trim().replace(/"/g, '""');
    
    // Split into terms and append * for prefix search on each term
    const terms = safeQuery.split(/\s+/).filter(t => t.length > 0);
    const matchQuery = terms.map(term => `"${term}"*`).join(' AND ');

    try {
      const stmt = db.prepare(`
        SELECT 
          rowid as id,
          brand_name, 
          generic_name, 
          strength, 
          dosage_form, 
          drug_category, 
          indication,
          manufacturer,
          prescription_type,
          packaging,
          rank
        FROM medicines 
        WHERE medicines MATCH @matchQuery
        ORDER BY rank
        LIMIT 15
      `);

      return stmt.all({ matchQuery });
    } catch (error) {
      console.error('Medicine search error:', error);
      // Fallback if FTS parsing fails due to special characters
      return [];
    }
  }
}

export const medicineService = new MedicineService();
