import express from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from './expense.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from './expense.validator.js';

const router = express.Router();

router.get('/', getExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.patch('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
