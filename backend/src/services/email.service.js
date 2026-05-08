import { Resend } from 'resend';
import dotenv from 'dotenv';
import { pdfService } from './pdf.service.js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'Siara Dental <onboarding@resend.dev>';

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is missing from environment variables!');
} else {
  console.log('✅ Resend API client initialized');
}

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
    if (!patient.email) return;

    const html = `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color: #0070f3; margin: 0;">Siara Dental</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Advanced Patient Care</p>
        </div>
        
        <h2>Welcome to Siara Dental, ${patient.name}!</h2>
        <p>Thank you for choosing Siara Dental for your oral healthcare needs. We are thrilled to have you as part of our family.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Patient Details:</h3>
          <p style="margin: 5px 0;"><strong>Patient ID:</strong> ${patient.id}</p>
          <p style="margin: 5px 0;"><strong>Registered Date:</strong> ${patient.registeredOn}</p>
        </div>

        <p>You can now book appointments, view your prescriptions, and manage your dental records through our portal.</p>
        
        <a href="https://siara-dental.com/login" style="${buttonStyle}">Login to Dashboard</a>

        <p>If you have any questions, feel free to reply to this email or call us at our clinical helpdesk.</p>

        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} Siara Dental Clinic. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: 'Welcome to Siara Dental - Your Patient Registration',
        html,
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
    if (!patient.email) return;

    const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription);

    const medicinesHtml = prescription.medicines.map(m => `
      <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
        <p style="margin: 0; font-weight: 600;">${m.name}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${m.dosage} · ${m.frequency} · ${m.duration}</p>
      </div>
    `).join('');

    const html = `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color: #0070f3; margin: 0;">Siara Dental</h1>
        </div>

        <h2>New Prescription Issued</h2>
        <p>Hi ${patient.name}, Dr. Saikiran has issued a new prescription for you. We have attached a PDF copy for your records.</p>

        <div style="background-color: #f0f7ff; border-left: 4px solid #0070f3; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #0056b3;"><strong>Date:</strong> ${prescription.date}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #0056b3;"><strong>ID:</strong> ${prescription.id}</p>
        </div>

        <h3>Medicines:</h3>
        ${medicinesHtml}

        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} Siara Dental Clinic</p>
        </div>
      </div>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: `New Prescription from Siara Dental - ${prescription.id}`,
        html,
        attachments: [
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
    if (!patient.email) return;

    const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);

    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">Rs ${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color: #0070f3; margin: 0;">Siara Dental</h1>
        </div>

        <h2 style="text-align: center;">INVOICE</h2>
        <p>Hi ${patient.name}, please find your invoice attached as a PDF.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="text-align: left; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Service</th>
              <th style="text-align: right; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td style="padding: 20px 0 10px 0; font-weight: 700; font-size: 18px;">Total</td>
              <td style="padding: 20px 0 10px 0; font-weight: 700; font-size: 18px; text-align: right; color: #0070f3;">Rs ${invoice.total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="${footerStyle}">
          <p>&copy; ${new Date().getFullYear()} Siara Dental Clinic</p>
        </div>
      </div>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: patient.email,
        subject: `Invoice from Siara Dental - ${invoice.id}`,
        html,
        attachments: [
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
