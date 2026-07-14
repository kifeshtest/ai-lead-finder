import { Router } from 'express';
import { verifyCredentials, issueToken, loginRateLimit, requireAuth } from '../auth/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (!verifyCredentials(username || '', password || '')) {
    return res.status(401).json({ error: 'Gebruikersnaam of wachtwoord is onjuist.' });
  }
  res.json({ token: issueToken(username), user: username });
});

// GET /api/auth/me  → controleer of een token nog geldig is
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.sub }));

export default router;
