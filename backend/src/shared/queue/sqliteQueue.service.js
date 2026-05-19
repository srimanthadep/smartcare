import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'queue.sqlite');

class SqliteQueue {
  constructor() {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    this.db = new Database(DB_PATH);
    this.init();
  }

  init() {
    // Create queues table if missing, then perform column migrations safely
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS queues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Add new columns if they do not exist
    const cols = this.db.prepare(`PRAGMA table_info(queues)`).all();
    const colNames = cols.map(c => c.name);
    if (!colNames.includes('dedup_key')) {
      this.db.exec(`ALTER TABLE queues ADD COLUMN dedup_key TEXT`);
    }
    if (!colNames.includes('run_at')) {
      // default run_at to created_at for existing rows
      this.db.exec(`ALTER TABLE queues ADD COLUMN run_at INTEGER`);
      this.db.exec(`UPDATE queues SET run_at = created_at WHERE run_at IS NULL`);
    }

    // Create index referencing run_at after ensuring column exists
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_queues_type_status_runat ON queues(type, status, run_at, created_at)`);

    // Additional helper tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE,
        mime TEXT,
        file_name TEXT,
        data TEXT,
        provider TEXT,
        provider_id TEXT,
        created_at INTEGER
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ack_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_id INTEGER,
        message_id TEXT,
        status TEXT,
        last_update INTEGER
      );
    `);
  }

  enqueue(type, action, payload = {}, opts = {}) {
    const now = Date.now();
    const runAt = opts.runAt || now;
    const dedupKey = opts.dedupKey || null;
    if (dedupKey) {
      const exists = this.db.prepare(`SELECT id FROM queues WHERE dedup_key = ? AND status = 'pending'`).get(dedupKey);
      if (exists) return exists.id;
    }
    const stmt = this.db.prepare(`INSERT INTO queues (type, action, payload, dedup_key, run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(type, action, JSON.stringify(payload || {}), dedupKey, runAt, now, now);
    return info.lastInsertRowid;
  }

  fetchNext(type) {
    const now = Date.now();
    const select = this.db.prepare(`SELECT * FROM queues WHERE type = ? AND status = 'pending' AND run_at <= ? ORDER BY run_at, created_at LIMIT 1`);
    const row = select.get(type, now);
    if (!row) return null;
    const update = this.db.prepare(`UPDATE queues SET status = 'in_progress', updated_at = ? WHERE id = ?`);
    update.run(now, row.id);
    return { ...row, payload: JSON.parse(row.payload || '{}') };
  }

  markDone(id) {
    const now = Date.now();
    const stmt = this.db.prepare(`UPDATE queues SET status = 'done', updated_at = ? WHERE id = ?`);
    stmt.run(now, id);
  }

  markFailed(id, errorMsg) {
    const now = Date.now();
    const stmt = this.db.prepare(`UPDATE queues SET status = 'failed', attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?`);
    stmt.run(String(errorMsg || ''), now, id);
  }

  requeue(id, delayMs = 0, errorMsg = null) {
    const now = Date.now();
    const runAt = now + Math.max(0, delayMs);
    const stmt = errorMsg
      ? this.db.prepare(`UPDATE queues SET status = 'pending', last_error = ?, updated_at = ?, run_at = ? WHERE id = ?`)
      : this.db.prepare(`UPDATE queues SET status = 'pending', updated_at = ?, run_at = ? WHERE id = ?`);

    if (errorMsg) {
      stmt.run(String(errorMsg), now, runAt, id);
    } else {
      stmt.run(now, runAt, id);
    }
  }

  stats() {
    const row = this.db.prepare(`SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM queues`).get();
    return row;
  }

  // Media cache helpers
  addMediaCache(hash, mime, fileName, base64Data, provider = null, providerId = null) {
    const now = Date.now();
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO media_cache (hash, mime, file_name, data, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(hash, mime, fileName, base64Data, provider, providerId, now);
  }

  getMediaCache(hash) {
    return this.db.prepare(`SELECT * FROM media_cache WHERE hash = ?`).get(hash);
  }

  // ACK tracking
  addAck(queueId, messageId, status = 'queued') {
    const now = Date.now();
    this.db.prepare(`INSERT INTO ack_tracking (queue_id, message_id, status, last_update) VALUES (?, ?, ?, ? )`).run(queueId, messageId, status, now);
  }

  updateAck(messageId, status) {
    const now = Date.now();
    this.db.prepare(`UPDATE ack_tracking SET status = ?, last_update = ? WHERE message_id = ?`).run(status, now, messageId);
  }

  getDb() { return this.db; }
}

export const sqliteQueue = new SqliteQueue();
