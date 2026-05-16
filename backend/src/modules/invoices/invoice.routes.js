import { Router } from 'express';
import * as invoiceController from './invoice.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema } from './invoice.validator.js';

const router = Router();

router.get('/', invoiceController.getInvoices);
router.post('/', validate(createInvoiceSchema), invoiceController.createInvoice);
router.get('/:id/download', invoiceController.downloadInvoice);
router.patch('/:id', validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;
