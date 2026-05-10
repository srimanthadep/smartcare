import cron from 'node-cron';
import { ZipArchive } from 'archiver';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService } from './db.service.js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initBackupService = () => {
    console.log('🔧 Initializing daily backup service...');
    console.log('⏰ Backups will run at 12:00 AM IST daily');

    cron.schedule('0 0 * * *', async () => {
        console.log('📦 Starting daily automated database backup...');
        await performFullBackup();
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Appointment reminders — 9 AM daily IST
    cron.schedule('0 9 * * *', async () => {
        console.log('📅 Sending appointment reminders for tomorrow...');
        await sendAppointmentReminders();
    }, {
        timezone: 'Asia/Kolkata'
    });
};

export const sendAppointmentReminders = async () => {
    try {
        const { dbService } = await import('./db.service.js');
        const { whatsappService } = await import('./whatsapp.service.js');

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
    const backupRootDir = path.join(__dirname, '../../backups');
    
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

        console.log('📋 Fetching all database tables...');
        const dbData = await dbService.read(); // Fetches all tables via PG
        const tables = Object.keys(dbData);
        console.log(`✅ Found ${tables.length} tables`);

        for (const tableName of tables) {
            console.log(`  📄 Exporting ${tableName}...`);
            const data = dbData[tableName];
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
        const archive = new ZipArchive({ zlib: { level: 9 } });

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
