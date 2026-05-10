import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', auth, authController.getMe);
router.post('/logout', auth, (req, res) => {
  res.clearCookie('AuthToken', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully' });
});

export default router;
