import cron from 'node-cron';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService } from '../../core/db/db.service.js';
import { config } from '../../core/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_SETTINGS_KEY = 'backup_schedule';
const DEFAULT_BACKUP_SETTINGS = {
    enabled: true,
    intervalDays: 1,
    startDate: null,
    lastBackupAt: null,
};

const getIstDateString = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

const parseDateOnly = (dateString) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
};

export const normalizeBackupSettings = (settings = {}) => {
    const intervalDays = Number.parseInt(settings.intervalDays, 10);
    const startDate = typeof settings.startDate === 'string' && parseDateOnly(settings.startDate)
        ? settings.startDate
        : DEFAULT_BACKUP_SETTINGS.startDate;

    return {
        enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_BACKUP_SETTINGS.enabled,
        intervalDays: Number.isFinite(intervalDays) ? Math.min(Math.max(intervalDays, 1), 365) : DEFAULT_BACKUP_SETTINGS.intervalDays,
        startDate,
        lastBackupAt: typeof settings.lastBackupAt === 'string' ? settings.lastBackupAt : DEFAULT_BACKUP_SETTINGS.lastBackupAt,
    };
};

export const getBackupSettings = async () => {
    const result = await dbService.query('SELECT value FROM app_settings WHERE key = $1', [BACKUP_SETTINGS_KEY]);
    if (result.rows.length === 0) {
        return normalizeBackupSettings(DEFAULT_BACKUP_SETTINGS);
    }

    return normalizeBackupSettings(result.rows[0].value);
};

export const updateBackupSettings = async (updates = {}) => {
    const current = await getBackupSettings();
    const next = normalizeBackupSettings({ ...current, ...updates });
    if (next.enabled && next.intervalDays > 1 && !next.startDate) {
        next.startDate = getIstDateString();
    }

    const result = await dbService.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
         RETURNING value`,
        [BACKUP_SETTINGS_KEY, JSON.stringify(next)]
    );

    return normalizeBackupSettings(result.rows[0].value);
};

export const isBackupDue = (settings, date = new Date()) => {
    const normalized = normalizeBackupSettings(settings);
    if (!normalized.enabled) return false;

    const today = getIstDateString(date);
    const startDate = normalized.startDate || today;
    const todayTime = parseDateOnly(today);
    const startTime = parseDateOnly(startDate);

    if (!todayTime || !startTime || todayTime < startTime) return false;

    const daysSinceStart = Math.floor((todayTime - startTime) / (24 * 60 * 60 * 1000));
    return daysSinceStart % normalized.intervalDays === 0;
};

export const runScheduledBackupIfDue = async () => {
    const settings = await getBackupSettings();
    if (!isBackupDue(settings)) {
        console.log(`📦 Automated backup skipped. Enabled: ${settings.enabled}, interval: ${settings.intervalDays} day(s), start: ${settings.startDate || 'today'}`);
        return;
    }

    console.log(`📦 Starting scheduled database backup. Interval: ${settings.intervalDays} day(s)`);
    await performFullBackup();
    await updateBackupSettings({ lastBackupAt: new Date().toISOString() });
};

export const initBackupService = () => {
    // ─────────────────────────────────────────────────────────────────────
    // NOTE: Cron scheduling is now handled by scheduler.service.js
    // - Daily backups (2 AM IST) 
    // - Appointment reminders (9 AM IST)
    // This function now only logs startup confirmation.
    // ─────────────────────────────────────────────────────────────────────
    console.log('🔧 Backup service initialized');
};

export const sendAppointmentReminders = async () => {
    try {
        const { dbService } = await import('../../core/db/db.service.js');
        const { whatsappService } = await import('../../modules/whatsapp/whatsapp.service.js');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const result = await dbService.query(`
            SELECT a.time, a.type, p.name, p.phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.date = $1 AND a.status != 'Cancelled'
        `, [tomorrowStr]);

        if (result.rows.length === 0) {
            console.log('📅 No appointments tomorrow — skipping reminders.');
            return;
        }

        let sent = 0;
        for (const appt of result.rows) {
            try {
                await whatsappService.sendReminder(appt);
                sent++;
            } catch (e) {
                console.error(`WA reminder failed for ${appt.name}:`, e.message);
            }
        }
        console.log(`✅ Sent ${sent}/${result.rows.length} appointment reminders`);
    } catch (err) {
        console.error('❌ Appointment reminder cron failed:', err.message);
    }
};

export const performFullBackup = async () => {
    const backupRootDir = path.join(__dirname, '../../../backups');
    
    if (!fs.existsSync(backupRootDir)) {
        fs.mkdirSync(backupRootDir, { recursive: true });
    }

    const tempDir = path.join(backupRootDir, `temp_${Date.now()}`);
    let zipFile = null;

    try {
        console.log(`📁 Creating temporary backup directory: ${tempDir}`);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // H9: Process one table at a time to avoid loading entire DB into memory
        const tables = [
            'users', 'patients', 'doctors', 'appointments',
            'invoices', 'prescriptions', 'medicines', 'prescription_templates',
            'activity_logs', 'dental_charts', 'treatment_plans', 'diagnoses', 'reports', 'clinical_procedures'
        ];
        console.log(`✅ Processing ${tables.length} tables (streaming)`);

        for (const tableName of tables) {
            console.log(`  📄 Exporting ${tableName}...`);
            const data = await dbService.streamTableRows(tableName);
            const filePath = path.join(tempDir, `${tableName}.json`);
            
            fs.writeFileSync(
                filePath,
                JSON.stringify(data, null, 2)
            );
            console.log(`     ✅ ${tableName}: ${data.length} records`);
        }

        const dateStr = new Date().toISOString().split('T')[0];
        zipFile = path.join(backupRootDir, `full_db_backup_${dateStr}.zip`);
        
        console.log(`📦 Creating ZIP archive: ${zipFile}`);
        
        const output = fs.createWriteStream(zipFile);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            output.on('finish', resolve);
            output.on('error', reject);
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(tempDir, false);
            archive.finalize();
        });

        console.log(`✅ ZIP created successfully`);

        if (fs.existsSync(zipFile)) {
            try {
                console.log('📧 Sending backup email...');
                await sendBackupEmail(
                    [zipFile],
                    `DAILY Database Backup - ${dateStr}`
                );
                console.log('✅ Backup emailed successfully');
            } catch (emailErr) {
                console.error('⚠️ Backup ZIP created but email failed:', emailErr.message);
            }
        } else {
            console.error('❌ ZIP file was not created, skipping email');
        }

        console.log(`✅ Daily institutional backup completed: ${zipFile}`);

    } catch (err) {
        console.error('❌ Daily Backup Failed:', err.message);
        throw err;
    } finally {
        if (tempDir && fs.existsSync(tempDir)) {
            console.log('🧹 Cleaning up temporary files...');
            fs.rmSync(tempDir, { recursive: true, force: true });
        }

        console.log('♻️ Rotating old backups...');
        if (fs.existsSync(backupRootDir)) {
            const allBackups = fs.readdirSync(backupRootDir)
                .filter(f => f.startsWith('full_db_backup_') && f.endsWith('.zip'))
                .sort()
                .reverse();

            const toDelete = allBackups.slice(7);
            if (toDelete.length > 0) {
                console.log(`   🗑️  Deleting ${toDelete.length} old backups...`);
            }

            for (const oldFile of toDelete) {
                try {
                    fs.unlinkSync(path.join(backupRootDir, oldFile));
                    console.log(`      ♻️ Deleted: ${oldFile}`);
                } catch (err) {
                    console.warn(`      ⚠️ Failed to delete ${oldFile}: ${err.message}`);
                }
            }
        }
    }
    
    return zipFile;
};

export const sendBackupEmail = async (attachments, subject) => {
    const resendApiKey = config.RESEND_API_KEY;
    const fromEmail = config.RESEND_FROM_EMAIL;
    const toEmails = (config.RESEND_TO_EMAIL || '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

    if (!resendApiKey || !fromEmail || toEmails.length === 0) {
        console.warn('⚠️ Backup email not sent: Resend credentials not configured correctly.');
        return;
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; line-height: 1.6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden; }
            .header { background: linear-gradient(135deg, #242f8c 0%, #1a237e 100%); padding: 40px 20px; text-align: center; }
            .header-text { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
            .content { padding: 40px; }
            .status-badge { display: inline-block; padding: 6px 16px; background: #dcfce7; color: #10b981; border-radius: 50px; font-weight: 700; font-size: 13px; text-transform: uppercase; margin-bottom: 24px; }
            h2 { margin: 0 0 16px; color: #0f172a; }
            p { font-size: 16px; color: #475569; margin: 0 0 24px; }
            .details-card { background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .detail-label { font-weight: 600; color: #64748b; }
            .detail-value { font-weight: 500; color: #0f172a; }
            .footer { padding: 30px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-text">SIARA DENTAL MANAGEMENT</div>
            </div>
            <div class="content">
                <div class="status-badge">System Backup Success</div>
                <h2>Database Backup Ready</h2>
                <p>Hello Admin,</p>
                <p>The database backup has been completed successfully. Your data is now securely archived and ready for recovery if needed.</p>
                
                <div class="details-card">
                    <div class="detail-row"><span class="detail-label">Backup Type</span><span class="detail-value">Full Database ZIP</span></div>
                    <div class="detail-row"><span class="detail-label">Date Generated</span><span class="detail-value">${new Date().toDateString()}</span></div>
                    <div class="detail-row"><span class="detail-label">Time (IST)</span><span class="detail-value">${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
                    <div class="detail-row"><span class="detail-label">Total Files</span><span class="detail-value">${attachments.length} Archive(s)</span></div>
                </div>

                <p style="font-size: 14px; color: #64748b;">The backup files are attached to this email. Please store them in a safe location.</p>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Siara Dental SaaS. All rights reserved.</div>
        </div>
    </body>
    </html>
    `;

    try {
        console.log(`🔌 Sending backup email via Resend...`);
        const resendAttachments = attachments.map(file => ({
            filename: path.basename(file),
            content: fs.readFileSync(file)
        }));

        const { data, error } = await resend.emails.send({
            from: `"Siara Dental Backup" <${fromEmail}>`,
            to: toEmails,
            subject: subject || `DAILY Database Backup - ${new Date().toDateString()}`,
            html: emailHtml,
            attachments: resendAttachments
        });

        if (error) {
            console.error('❌ Resend API Error:', error.message);
        } else {
            console.log('✅ Backup email sent successfully!');
        }
    } catch (sendErr) {
        console.error('❌ Failed to send backup email:', sendErr.message);
    }
};
