import { performFullBackup } from './src/services/backupService.js';

async function test() {
  try {
    const zipPath = await performFullBackup();
    console.log('Success:', zipPath);
  } catch (err) {
    console.error('Error testing backup:', err);
  }
}

test();
