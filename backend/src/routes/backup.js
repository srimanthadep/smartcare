import express from 'express';
import path from 'path';
import fs from 'fs';
import { performFullBackup } from '../services/backupService.js';

const router = express.Router();

let backupInProgress = false;

router.post('/download', async (req, res) => {
    if (backupInProgress) {
        return res.status(429).json({ message: 'A backup is already in progress. Please wait.' });
    }

    try {
        backupInProgress = true;
        const zipFile = await performFullBackup();
        
        if (!zipFile || !fs.existsSync(zipFile)) {
            throw new Error('Backup file was not created successfully.');
        }

        const fileName = path.basename(zipFile);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const readStream = fs.createReadStream(zipFile);
        readStream.pipe(res);

        // Delete the backup zip after it has been fully downloaded if we don't want to keep it
        // However, performFullBackup already handles rotation so keeping it is fine.
        
    } catch (err) {
        console.error('Manual Backup Download Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to generate backup.' });
        }
    } finally {
        backupInProgress = false;
    }
});

export default router;
