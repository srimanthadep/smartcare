import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', auth, authController.getMe);

export default router;
