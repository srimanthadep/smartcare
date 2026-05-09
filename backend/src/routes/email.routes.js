import { Router } from 'express';
import { getEmailStatus, setEmailStatus } from '../services/email.service.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/status', auth, (req, res) => {
  res.json(getEmailStatus());
});

router.post('/toggle', auth, authorize('doctor', 'admin'), (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'Enabled field must be a boolean' });
  }
  const status = setEmailStatus(enabled);
  res.json(status);
});

export default router;
