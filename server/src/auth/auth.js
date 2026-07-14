import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// JWT-secret: uit env, anders willekeurig (dan verlopen sessies bij herstart).
const SECRET = config.jwtSecret || crypto.randomBytes(32).toString('hex');
if (!config.jwtSecret) {
  logger.warn('JWT_SECRET niet gezet — willekeurig gegenereerd. Zet JWT_SECRET in productie zodat sessies een herstart overleven.');
}
if (config.authPassword === 'changeme') {
  logger.warn('ADMIN_PASSWORD niet gezet — standaard "changeme". Stel een eigen wachtwoord in via env!');
}

// Wachtwoord wordt bij het opstarten gehasht en nooit als leesbare tekst opgeslagen.
const passwordHash = bcrypt.hashSync(config.authPassword, 10);

export function verifyCredentials(username, password) {
  const userOk = String(username) === config.authUsername;
  const passOk = bcrypt.compareSync(String(password || ''), passwordHash); // altijd uitvoeren (timing)
  return userOk && passOk;
}

export function issueToken(username) {
  return jwt.sign({ sub: username }, SECRET, { expiresIn: `${config.jwtTtlHours}h` });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Niet ingelogd' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessie verlopen of ongeldig' });
  }
}

// Eenvoudige in-memory rate limiter tegen wachtwoord-raden.
const attempts = new Map(); // ip -> { count, first }
export function loginRateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.ip || 'onbekend').toString().split(',')[0].trim();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 10;
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > windowMs) {
    attempts.set(ip, { count: 1, first: now });
    return next();
  }
  rec.count += 1;
  if (rec.count > max) {
    return res.status(429).json({ error: 'Te veel inlogpogingen. Probeer over een kwartier opnieuw.' });
  }
  next();
}
