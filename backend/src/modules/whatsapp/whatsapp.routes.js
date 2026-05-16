import { Router } from 'express';
import { getStatus, initWhatsApp, disconnectWhatsApp } from './whatsapp.service.js';
import { auth, authorize } from '../../core/middleware/auth.js';

const router = Router();

router.get('/status', auth, (req, res) => {
  res.json(getStatus());
});

router.post('/connect', auth, async (req, res) => {
  console.log('📡 POST /api/whatsapp/connect hit');
  try {
    initWhatsApp();
    res.json({ message: "Connecting..." });
  } catch (err) {
    console.error('Error in /connect route:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/disconnect', auth, async (req, res) => {
  await disconnectWhatsApp();
  res.json({ message: "Disconnected" });
});

router.get('/qr-stream', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = () => {
    const status = getStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
    
    if (status.status === 'connected') {
      clearInterval(interval);
      res.end();
    }
  };

  const interval = setInterval(sendUpdate, 1500);

  // Initial update
  sendUpdate();

  // Timeout after 2 minutes
  const timeout = setTimeout(() => {
    clearInterval(interval);
    res.end();
  }, 120000);

  req.on('close', () => {
    clearInterval(interval);
    clearTimeout(timeout);
  });
});

export default router;
