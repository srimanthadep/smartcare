import express from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator.js';

const router = express.Router();

router.get('/', getExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.patch('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
