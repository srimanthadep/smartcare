import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/db.json');

let writeQueue = Promise.resolve();

const DEFAULTS = {
  users: [],
  doctors: [],
  doctorAvailability: [],
  queue: [],
  patients: [],
  diagnoses: [],
  reports: [],
  appointments: [],
  invoices: [],
  medicines: [],
  prescriptionTemplates: [],
  prescriptions: [],
  activityLogs: [],
  dentalCharts: [],
};

class DbService {
  async read() {
    try {
      const raw = await readFile(dbPath, 'utf8');
      const db = JSON.parse(raw);
      this._ensureShape(db);
      return db;
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  async write(db) {
    writeQueue = writeQueue.then(() =>
      writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8')
    );
    return writeQueue;
  }

  _ensureShape(db) {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (!Array.isArray(db[key])) {
        db[key] = value;
      }
    }
  }

  async getCollection(name) {
    const db = await this.read();
    return db[name] || [];
  }

  async saveCollection(name, data) {
    const db = await this.read();
    db[name] = data;
    await this.write(db);
  }

  generateId(prefix, existingIds) {
    let value = existingIds.length + 1;
    let next = `${prefix}${String(value).padStart(3, '0')}`;
    while (existingIds.includes(next)) {
      value += 1;
      next = `${prefix}${String(value).padStart(3, '0')}`;
    }
    return next;
  }
}

export const dbService = new DbService();
