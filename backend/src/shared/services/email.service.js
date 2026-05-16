import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pdfService } from './pdf.service.js';
import { config } from '../../core/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = fileURLToPath(new URL('../../../assets/logo.png', import.meta.url));

const resend = new Resend(config.RESEND_API_KEY);
const FROM_EMAIL = config.RESEND_FROM_EMAIL || 'Siara Dental <onboarding@resend.dev>';
const LOGO_BUFFER = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

if (!config.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is missing from environment variables!');
} else {
  console.log('✅ Resend API client initialized');
}

let emailEnabled = true;

export const getEmailStatus = () => ({ enabled: emailEnabled });
export const setEmailStatus = (enabled) => {
  emailEnabled = enabled;
  console.log(`📧 Email service ${enabled ? 'enabled' : 'disabled'}`);
  return getEmailStatus();
};

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
`;

const headerStyle = `
  text-align: center;
  margin-bottom: 30px;
`;

const footerStyle = `
  text-align: center;
  margin-top: 40px;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #0070f3;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  margin: 20px 0;
`;

export const emailService = {
  // --- Core Methods ---

  async sendWelcomeEmail(patient) {
    if (!emailEnabled) {
      throw new Error('Email service is disabled');
    }
    if (!patient.email) return;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#f5f7fb; font-family:'Poppins', sans-serif; padding:40px 15px; color:#333; }
.email-container { max-width:700px; margin:auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04); }
.hero { position:relative; background: linear-gradient(135deg,#1d0d08 0%,#3a1a10 45%,#ff7a1a 180%); padding:60px 40px 80px; text-align:center; overflow:hidden; }
.hero::before { content:''; position:absolute; width:300px; height:300px; background:rgba(255,255,255,0.04); border-radius:50%; top:-120px; left:-100px; }
.hero::after { content:''; position:absolute; width:250px; height:250px; background:rgba(255,255,255,0.03); border-radius:50%; bottom:-120px; right:-100px; }
.logo-wrapper { position:relative; z-index:2; }
.logo { width:150px; height:150px; border-radius:50%; object-fit:cover; border:6px solid rgba(255,255,255,0.15); background:#fff; padding:6px; box-shadow:0 8px 30px rgba(0,0,0,0.25); }
.brand { color:#fff; margin-top:25px; font-size:40px; font-weight:700; letter-spacing:3px; }
.tagline { margin-top:12px; color:#ffb27a; font-size:15px; letter-spacing:5px; text-transform:uppercase; }
.content { padding:55px 45px; }
.badge { display:inline-block; background:#fff3ea; color:#ff7a1a; padding:10px 18px; border-radius:100px; font-size:13px; font-weight:600; margin-bottom:25px; }
.title { font-size:40px; color:#1d0d08; font-weight:700; line-height:1.2; margin-bottom:25px; }
.highlight { color:#ff7a1a; }
.text { font-size:16px; line-height:1.9; color:#555; margin-bottom:22px; }
.glass-card { margin:40px 0; background: linear-gradient(135deg, rgba(255,122,26,0.08), rgba(255,255,255,1)); border:1px solid rgba(255,122,26,0.12); border-radius:24px; padding:32px; }
.glass-title { font-size:22px; color:#1d0d08; margin-bottom:15px; font-weight:600; }
.glass-text { color:#555; line-height:1.8; font-size:15px; }
.section-title { font-size:24px; font-weight:700; color:#1d0d08; margin-bottom:25px; }
.services { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:40px; }
.service { background:#fff; border:1px solid #f1f1f1; border-radius:20px; padding:22px; transition:0.3s ease; box-shadow:0 5px 15px rgba(0,0,0,0.04); }
.service:hover { transform:translateY(-3px); }
.service-icon { font-size:28px; margin-bottom:14px; }
.service-title { font-size:16px; font-weight:600; color:#1d0d08; margin-bottom:8px; }
.service-desc { font-size:14px; line-height:1.7; color:#666; }
.cta-box { background: linear-gradient(135deg,#1d0d08,#3b1b11); border-radius:28px; padding:40px; text-align:center; color:#fff; margin-top:20px; }
.cta-title { font-size:30px; font-weight:700; margin-bottom:15px; }
.cta-text { color:#ddd; line-height:1.8; margin-bottom:30px; }
.button { display:inline-block; background:#ff7a1a; color:#fff !important; text-decoration:none; padding:18px 38px; border-radius:100px; font-weight:600; font-size:15px; box-shadow:0 10px 25px rgba(255,122,26,0.35); }
.footer { padding:35px 30px; text-align:center; background:#fafafa; border-top:1px solid #eee; }
.footer-logo { font-size:22px; font-weight:700; color:#1d0d08; margin-bottom:10px; }
.footer-text { color:#777; font-size:14px; line-height:1.8; }
.footer a { color:#ff7a1a; text-decoration:none; font-weight:600; }
@media(max-width:650px){
  .brand { font-size:30px; }
  .content { padding:40px 25px; }
  .title { font-size:32px; }
  .services { grid-template-columns:1fr; }
  .cta-box { padding:30px 25px; }
  .cta-title { font-size:24px; }
}
</style>
</head>
<body>
<div class="email-container">
  <div class="hero">
    <div class="logo-wrapper">
      <img src="cid:logo" alt="SIARA DENTAL" class="logo">
      <div class="brand">SIARA DENTAL</div>
      <div class="tagline">Creating Miles Of Smiles</div>
    </div>
  </div>
  <div class="content">
    <div class="badge">✨ Welcome To Our Dental Family</div>
    <div class="title">Your Smile Journey Begins With <span class="highlight">SIARA DENTAL</span></div>
    <p class="text">Dear <strong>${patient.name}</strong>,</p>
    <p class="text">Thank you for choosing <strong>SIARA DENTAL</strong>. We are delighted to welcome you to our clinic and truly appreciate the trust you have placed in us for your dental care.</p>
    <p class="text">Our mission is simple — to deliver exceptional dental treatments with advanced technology, compassionate care, and a comfortable patient experience that makes every visit stress-free and memorable.</p>
    <div class="glass-card">
      <div class="glass-title">🦷 Personalized Care For Every Smile</div>
      <div class="glass-text">At SIARA DENTAL, we believe every smile is unique. From routine dental checkups to complete smile transformations, our expert team is committed to providing world-class care tailored specifically for you.</div>
    </div>
    <div class="section-title">Our Specialized Treatments</div>
    <div class="services">
      <div class="service">
        <div class="service-icon">✨</div>
        <div class="service-title">Smile Designing</div>
        <div class="service-desc">Enhance your confidence with aesthetic smile makeovers and cosmetic dentistry.</div>
      </div>
      <div class="service">
        <div class="service-icon">🦷</div>
        <div class="service-title">Dental Implants</div>
        <div class="service-desc">Advanced implant solutions for restoring functionality and natural smiles.</div>
      </div>
      <div class="service">
        <div class="service-icon">😁</div>
        <div class="service-title">Aligners & Braces</div>
        <div class="service-desc">Modern orthodontic solutions designed for comfortable teeth alignment.</div>
      </div>
      <div class="service">
        <div class="service-icon">💎</div>
        <div class="service-title">Premium Dental Care</div>
        <div class="service-desc">Gentle, painless, and technology-driven dental treatments for all ages.</div>
      </div>
    </div>
    <div class="cta-box">
      <div class="cta-title">We’re Excited To Care For Your Smile</div>
      <div class="cta-text">Thank you once again for registering with SIARA DENTAL. We look forward to helping you achieve a healthy, confident, and beautiful smile.</div>
      <a href="https://siaradental.in" class="button">Visit Our Website</a>
    </div>
  </div>
  <div class="footer">
    <div class="footer-logo">SIARA DENTAL</div>
    <div class="footer-text">Creating Beautiful Smiles With Care, Precision & Excellence.<br><br>🌐 <a href="https://siaradental.in">www.siaradental.in</a><br>Hyderabad, Telangana</div>
  </div>
</div>
</body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: 'Welcome to Siara Dental - Creating Miles Of Smiles',
        html,
        attachments: [
          {
            filename: 'logo.png',
            content: LOGO_BUFFER,
            cid: 'logo',
            disposition: 'inline'
          }
        ]
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw error;
      }

      console.log(`✅ Welcome email sent successfully! ID: ${data.id}`);
      return data;
    } catch (err) {
      console.error('Failed to send welcome email:', err);
      throw err;
    }
  },

  async sendPrescriptionEmail(patient, prescription) {
    if (!emailEnabled) {
      throw new Error('Email service is disabled');
    }
    if (!patient.email) return;

    const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription);

    const medicinesHtml = prescription.medicines.map(m => `
      <div style="background:#fff; border:1px solid #f1f1f1; border-radius:16px; padding:18px; margin-bottom:12px; box-shadow:0 4px 10px rgba(0,0,0,0.02);">
        <div style="font-size:18px; margin-bottom:6px;">💊</div>
        <div style="font-weight:700; color:#1d0d08; font-size:16px;">${m.name}</div>
        <div style="font-size:14px; color:#666; margin-top:4px; line-height:1.6;">
          ${m.dosage} · ${m.frequency} · ${m.duration}
        </div>
      </div>
    `).join('');

    let treatmentPlanHtml = '';
    if (prescription.treatmentPlan && prescription.treatmentPlan.length > 0) {
      treatmentPlanHtml = `
        <div class="section-title">Recommended Treatment Plan</div>
        <div style="background:#fdf4ff; border:1px solid #f5d0fe; border-radius:18px; padding:20px; margin-bottom:25px;">
          ${prescription.treatmentPlan.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(217,70,239,0.1);">
              <div style="flex:1;">
                <div style="font-weight:700; color:#701a75; font-size:15px;">${p.name}</div>
                ${p.description ? `<div style="font-size:12px; color:#a21caf; margin-top:2px;">${p.description}</div>` : ''}
              </div>
              <div style="font-weight:700; color:#c026d3; font-size:15px;">₹${p.estimatedCost?.toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#f5f7fb; font-family:'Poppins', sans-serif; padding:40px 15px; color:#333; }
.email-container { max-width:700px; margin:auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04); }
.hero { position:relative; background: linear-gradient(135deg,#1d0d08 0%,#3a1a10 45%,#ff7a1a 180%); padding:60px 40px 80px; text-align:center; overflow:hidden; }
.hero::before { content:''; position:absolute; width:300px; height:300px; background:rgba(255,255,255,0.04); border-radius:50%; top:-120px; left:-100px; }
.hero::after { content:''; position:absolute; width:250px; height:250px; background:rgba(255,255,255,0.03); border-radius:50%; bottom:-120px; right:-100px; }
.logo-wrapper { position:relative; z-index:2; }
.logo { width:120px; height:120px; border-radius:50%; object-fit:cover; border:6px solid rgba(255,255,255,0.15); background:#fff; padding:6px; }
.brand { color:#fff; margin-top:20px; font-size:32px; font-weight:700; letter-spacing:2px; }
.content { padding:50px 40px; }
.badge { display:inline-block; background:#fff3ea; color:#ff7a1a; padding:10px 18px; border-radius:100px; font-size:13px; font-weight:600; margin-bottom:25px; }
.title { font-size:36px; color:#1d0d08; font-weight:700; line-height:1.2; margin-bottom:25px; }
.highlight { color:#ff7a1a; }
.text { font-size:16px; line-height:1.9; color:#555; margin-bottom:22px; }
.glass-card { margin:30px 0; background: linear-gradient(135deg, rgba(255,122,26,0.08), rgba(255,255,255,1)); border:1px solid rgba(255,122,26,0.12); border-radius:24px; padding:28px; }
.glass-title { font-size:20px; color:#1d0d08; margin-bottom:12px; font-weight:600; }
.section-title { font-size:22px; font-weight:700; color:#1d0d08; margin:35px 0 20px; }
.footer { padding:30px; text-align:center; background:#fafafa; border-top:1px solid #eee; }
.footer-logo { font-size:20px; font-weight:700; color:#1d0d08; margin-bottom:8px; }
.footer-text { color:#777; font-size:13px; line-height:1.8; }
.footer a { color:#ff7a1a; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
<div class="email-container">
  <div class="hero">
    <div class="logo-wrapper">
      <img src="cid:logo" alt="SIARA DENTAL" class="logo">
      <div class="brand">SIARA DENTAL</div>
    </div>
  </div>
  <div class="content">
    <div class="badge">💊 New Prescription</div>
    <div class="title">Your <span class="highlight">Prescription</span> is Ready</div>
    <p class="text">Dear <strong>${patient.name}</strong>,</p>
    <p class="text">Dr. Saikiran has issued a new prescription for your ongoing treatment. We have attached a detailed PDF copy of this prescription for your records and easy reference.</p>
    
    <div class="glass-card">
      <div class="glass-title">📋 Prescription Details</div>
      <div style="font-size:15px; color:#555; line-height:1.8;">
        <strong>Date:</strong> ${prescription.date}<br>
        <strong>Prescription ID:</strong> ${prescription.id}<br>
        <strong>Doctor:</strong> Dr. Saikiran (Siara Dental)
      </div>
    </div>

    ${treatmentPlanHtml}

    <div class="section-title">Prescribed Medications</div>
    <div class="medications-list">
      ${medicinesHtml}
    </div>

    <p class="text" style="margin-top:30px; font-size:14px; color:#666;">
      Please follow the dosage instructions carefully. If you experience any side effects or have questions about your medication, do not hesitate to contact our clinic immediately.
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">SIARA DENTAL</div>
    <div class="footer-text">Creating Beautiful Smiles With Care & Excellence.<br>🌐 <a href="https://siaradental.in">www.siaradental.in</a></div>
  </div>
</div>
</body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: `New Prescription from Siara Dental - ${prescription.id}`,
        html,
        attachments: [
          {
            filename: 'logo.png',
            content: LOGO_BUFFER,
            cid: 'logo',
            disposition: 'inline'
          },
          {
            filename: `Prescription_${prescription.id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw error;
      }

      console.log(`✅ Prescription email sent! ID: ${data.id}`);
      return data;
    } catch (err) {
      console.error('Failed to send prescription email:', err);
      throw err;
    }
  },

  async sendInvoiceEmail(patient, invoice) {
    if (!emailEnabled) {
      throw new Error('Email service is disabled');
    }
    if (!patient.email) return;

    const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);

    const itemsHtml = invoice.items.map(item => `
      <tr style="border-bottom:1px solid #f1f1f1;">
        <td style="padding:15px 0; color:#1d0d08; font-size:15px; font-weight:500;">${item.description}</td>
        <td style="padding:15px 0; color:#ff7a1a; font-size:15px; font-weight:700; text-align:right;">₹${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#f5f7fb; font-family:'Poppins', sans-serif; padding:40px 15px; color:#333; }
.email-container { max-width:700px; margin:auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04); }
.hero { position:relative; background: linear-gradient(135deg,#1d0d08 0%,#3a1a10 45%,#ff7a1a 180%); padding:60px 40px 80px; text-align:center; overflow:hidden; }
.hero::before { content:''; position:absolute; width:300px; height:300px; background:rgba(255,255,255,0.04); border-radius:50%; top:-120px; left:-100px; }
.hero::after { content:''; position:absolute; width:250px; height:250px; background:rgba(255,255,255,0.03); border-radius:50%; bottom:-120px; right:-100px; }
.logo-wrapper { position:relative; z-index:2; }
.logo { width:120px; height:120px; border-radius:50%; object-fit:cover; border:6px solid rgba(255,255,255,0.15); background:#fff; padding:6px; }
.brand { color:#fff; margin-top:20px; font-size:32px; font-weight:700; letter-spacing:2px; }
.content { padding:50px 40px; }
.badge { display:inline-block; background:#fff3ea; color:#ff7a1a; padding:10px 18px; border-radius:100px; font-size:13px; font-weight:600; margin-bottom:25px; }
.title { font-size:36px; color:#1d0d08; font-weight:700; line-height:1.2; margin-bottom:25px; }
.highlight { color:#ff7a1a; }
.text { font-size:16px; line-height:1.9; color:#555; margin-bottom:22px; }
.glass-card { margin:30px 0; background: linear-gradient(135deg, rgba(255,122,26,0.08), rgba(255,255,255,1)); border:1px solid rgba(255,122,26,0.12); border-radius:24px; padding:28px; }
.glass-title { font-size:20px; color:#1d0d08; margin-bottom:12px; font-weight:600; }
.invoice-table { width:100%; border-collapse:collapse; margin-top:20px; }
.footer { padding:30px; text-align:center; background:#fafafa; border-top:1px solid #eee; }
.footer-logo { font-size:20px; font-weight:700; color:#1d0d08; margin-bottom:8px; }
.footer-text { color:#777; font-size:13px; line-height:1.8; }
.footer a { color:#ff7a1a; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
<div class="email-container">
  <div class="hero">
    <div class="logo-wrapper">
      <img src="cid:logo" alt="SIARA DENTAL" class="logo">
      <div class="brand">SIARA DENTAL</div>
    </div>
  </div>
  <div class="content">
    <div class="badge">📄 Invoice Issued</div>
    <div class="title">Your <span class="highlight">Invoice</span> is Ready</div>
    <p class="text">Dear <strong>${patient.name}</strong>,</p>
    <p class="text">Thank you for visiting Siara Dental. Your billing statement for the recent treatment has been generated. We have attached a PDF copy for your convenience.</p>
    
    <div class="glass-card">
      <div class="glass-title">💰 Billing Summary</div>
      <div style="font-size:15px; color:#555; line-height:1.8;">
        <strong>Invoice ID:</strong> ${invoice.id}<br>
        <strong>Date:</strong> ${invoice.date}<br>
        <strong>Status:</strong> <span style="color:#ff7a1a; font-weight:700;">${invoice.status}</span>
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr style="border-bottom:2px solid #ff7a1a;">
          <th style="text-align:left; padding:10px 0; color:#1d0d08; font-size:14px; text-transform:uppercase;">Service Description</th>
          <th style="text-align:right; padding:10px 0; color:#1d0d08; font-size:14px; text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding:25px 0 10px 0; font-size:20px; font-weight:700; color:#1d0d08;">Total Amount</td>
          <td style="padding:25px 0 10px 0; font-size:24px; font-weight:700; color:#ff7a1a; text-align:right;">₹${invoice.total.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>

    <p class="text" style="margin-top:40px; font-size:14px; color:#666;">
      If you have any questions regarding this invoice or require further clarification on the services provided, please reach out to our billing department.
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">SIARA DENTAL</div>
    <div class="footer-text">Creating Beautiful Smiles With Care & Excellence.<br>🌐 <a href="https://siaradental.in">www.siaradental.in</a></div>
  </div>
</div>
</body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: `Invoice from Siara Dental - ${invoice.id}`,
        html,
        attachments: [
          {
            filename: 'logo.png',
            content: LOGO_BUFFER,
            cid: 'logo',
            disposition: 'inline'
          },
          {
            filename: `Invoice_${invoice.id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw error;
      }

      console.log(`✅ Invoice email sent! ID: ${data.id}`);
      return data;
    } catch (err) {
      console.error('Failed to send invoice email:', err);
      throw err;
    }
  },

  // --- Advanced SDK Methods (As per instructions) ---

  async sendBatch(emails) {
    try {
      const { data, error } = await resend.batch.send(emails.map(e => ({
        from: FROM_EMAIL,
        ...e
      })));
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Batch send failed:', error);
      throw error;
    }
  },

  async getEmail(emailId) {
    return resend.emails.get(emailId);
  },

  async scheduleEmail(payload, scheduledAt) {
    try {
      return await resend.emails.send({
        from: FROM_EMAIL,
        ...payload,
        scheduledAt: scheduledAt // ISO 8601 string
      });
    } catch (error) {
      console.error('Scheduling failed:', error);
      throw error;
    }
  },

  async cancelEmail(emailId) {
    return resend.emails.cancel(emailId);
  },

  async listEmails() {
    return resend.emails.list();
  }
};
