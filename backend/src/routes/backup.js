import express from 'express';
import path from 'path';
import fs from 'fs';
import { getBackupSettings, performFullBackup, updateBackupSettings } from '../services/backupService.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

let backupInProgress = false;

router.get('/settings', authorize('doctor', 'admin'), async (req, res, next) => {
    try {
        const settings = await getBackupSettings();
        res.json(settings);
    } catch (err) {
        next(err);
    }
});

router.patch('/settings', authorize('doctor', 'admin'), async (req, res, next) => {
    try {
        const { enabled, intervalDays, startDate } = req.body || {};
        const updates = {};

        if (typeof enabled !== 'undefined') {
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ message: 'enabled must be true or false.' });
            }
            updates.enabled = enabled;
        }

        if (typeof intervalDays !== 'undefined') {
            const parsedInterval = Number.parseInt(intervalDays, 10);
            if (!Number.isFinite(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
                return res.status(400).json({ message: 'intervalDays must be between 1 and 365.' });
            }
            updates.intervalDays = parsedInterval;
        }

        if (typeof startDate !== 'undefined') {
            if (startDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                return res.status(400).json({ message: 'startDate must use YYYY-MM-DD format.' });
            }
            updates.startDate = startDate || null;
        }

        const settings = await updateBackupSettings(updates);
        res.json(settings);
    } catch (err) {
        next(err);
    }
});

router.post('/download', authorize('admin'), async (req, res) => {
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
