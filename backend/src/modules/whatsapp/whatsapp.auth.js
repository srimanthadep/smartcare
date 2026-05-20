import { BufferJSON } from '@whiskeysockets/baileys';
import { dbService } from '../../core/db/db.service.js';

/*
-- Run once in Supabase SQL editor to clean existing session bloat:
ALTER TABLE whatsapp_sessions 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DELETE FROM whatsapp_sessions
WHERE id NOT LIKE '%-creds';

-- Verify:
SELECT COUNT(*) FROM whatsapp_sessions;
*/

export const usePostgresAuthState = async (sessionId) => {
  const writeData = async (data, id) => {
    const json = JSON.stringify(data, BufferJSON.replacer);
    await dbService.query(
      'INSERT INTO whatsapp_sessions (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW()',
      [`${sessionId}-${id}`, json]
    );
  };

  const readData = async (id) => {
    try {
      const res = await dbService.query('SELECT data FROM whatsapp_sessions WHERE id = $1', [`${sessionId}-${id}`]);
      if (res.rows.length > 0) {
        return JSON.parse(res.rows[0].data, BufferJSON.reviver);
      }
    } catch (error) {
      console.error('Error reading whatsapp session:', error);
    }
    return null;
  };

  const removeData = async (id) => {
    try {
      await dbService.query('DELETE FROM whatsapp_sessions WHERE id = $1', [`${sessionId}-${id}`]);
    } catch (error) {
      console.error('Error removing whatsapp session:', error);
    }
  };

  const creds = (await readData('creds')) || (await import('@whiskeysockets/baileys')).initAuthCreds();

  // 2. Prune old signal keys (older than 7 days)
  try {
    const pruneRes = await dbService.query(`
      DELETE FROM whatsapp_sessions
      WHERE id LIKE $1
        AND id NOT LIKE $2
        AND created_at < NOW() - INTERVAL '7 days';
    `, [`${sessionId}-%`, `${sessionId}-creds`]);
    if (pruneRes.rowCount > 0) {
      console.log(`[WhatsApp Auth] Pruned ${pruneRes.rowCount} old signal keys.`);
    }
  } catch (err) {
    console.error('Error pruning old whatsapp sessions:', err);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              const value = await readData(`${type}-${id}`);
              data[id] = value || undefined;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const sId = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, sId));
              } else {
                tasks.push(removeData(sId));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
};

export const hasPostgresAuthState = async (sessionId) => {
  try {
    const res = await dbService.query(
      'SELECT 1 FROM whatsapp_sessions WHERE id = $1 LIMIT 1',
      [`${sessionId}-creds`]
    );
    return res.rows.length > 0;
  } catch (error) {
    if (error?.code !== '42P01') {
      console.error('Error checking whatsapp session:', error.message);
    }
    return false;
  }
};
