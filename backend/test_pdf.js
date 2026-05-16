import { pdfService } from './src/shared/services/pdf.service.js';
import fs from 'fs';

async function test() {
  const patient = { name: 'Test Patient', phone: '123', age: 30, gender: 'Male' };
  const invoice = { id: 'TEST001', date: '2026-05-16', items: [{ description: 'Test', amount: 100 }], total: 100, status: 'Paid' };
  
  console.log('Generating test PDF...');
  try {
    const buffer = await pdfService.generateInvoicePDF(patient, invoice);
    fs.writeFileSync('test_invoice.pdf', buffer);
    console.log('PDF generated: test_invoice.pdf, size:', buffer.length, 'bytes');
  } catch (err) {
    console.error('Generation failed:', err);
  }
}

test();
