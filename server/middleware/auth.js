const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'lifeos-dev-secret-change-in-production';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // Pull minimal user state to enforce suspensions on every request
    const user = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// Simple in-memory per-IP rate limiter (sliding window, N attempts per window)
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, keyPrefix = 'rl' } = {}) {
  const buckets = new Map();
  return function rateLimit(req, res, next) {
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim();
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const entry = buckets.get(key) || { hits: [], };
    entry.hits = entry.hits.filter(t => now - t < windowMs);
    if (entry.hits.length >= max) {
      const retrySec = Math.ceil((windowMs - (now - entry.hits[0])) / 1000);
      res.set('Retry-After', String(retrySec));
      return res.status(429).json({ error: `Too many attempts. Try again in ${retrySec}s.` });
    }
    entry.hits.push(now);
    buckets.set(key, entry);
    next();
  };
}

module.exports = { generateToken, authenticate, requireAdmin, createRateLimiter, JWT_SECRET };
