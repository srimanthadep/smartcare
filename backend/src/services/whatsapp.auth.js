import { BufferJSON } from '@whiskeysockets/baileys';
import { dbService } from './db.service.js';

export const usePostgresAuthState = async (sessionId) => {
  const writeData = async (data, id) => {
    const json = JSON.stringify(data, BufferJSON.replacer);
    await dbService.query(
      'INSERT INTO whatsapp_sessions (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
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

  const creds = (await readData('creds')) || (await import('@whiskeysockets/baileys')).initAuthState().creds;

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = (await import('@whiskeysockets/baileys')).proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
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
