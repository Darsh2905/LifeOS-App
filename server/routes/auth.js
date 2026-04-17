const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authenticate, createRateLimiter } = require('../middleware/auth');
const { generateVerificationToken, sendVerificationEmail, isEmailReady } = require('../services/email');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim() || null;
}

function validatePassword(pwd) {
  if (typeof pwd !== 'string') return 'Password is required.';
  if (pwd.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(pwd)) return 'Password must contain a letter.';
  if (!/[0-9]/.test(pwd)) return 'Password must contain a number.';
  return null;
}

function toUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    status: user.status || 'active',
    emailVerified: !!user.email_verified,
    avatar: (user.name || '?').charAt(0).toUpperCase(),
  };
}

const signupLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'signup' });
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' });
const resendLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 3, keyPrefix: 'resend' });

// POST /api/auth/signup
router.post('/signup', signupLimiter, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;

  if (!name || name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailRaw);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = genId();
  const hashed = bcrypt.hashSync(password, 10);

  // If SMTP is configured, require email verification; otherwise auto-verify
  const autoVerify = !isEmailReady() ? 1 : 0;

  db.prepare(
    'INSERT INTO users (id, name, email, password, role, status, email_verified, last_login_at, last_login_ip, login_count) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), ?, 1)'
  ).run(id, name, emailRaw, hashed, 'user', 'active', autoVerify, clientIp(req));

  // Create a default wallet account
  db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(genId(), id, 'Wallet', 'wallet', 0, '#9333ea', 'wallet', 1);

  // If email is configured, send verification email
  if (isEmailReady()) {
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)')
      .run(id, token, 'email', expiresAt);

    await sendVerificationEmail(emailRaw, name, token);

    return res.status(201).json({
      requiresVerification: true,
      message: 'Account created! Check your email to verify your account.',
      email: emailRaw,
    });
  }

  // Auto-verified (no SMTP) — return token immediately
  const user = db.prepare('SELECT id, name, email, role, status, email_verified FROM users WHERE id = ?').get(id);
  const jwtToken = generateToken(id);
  res.status(201).json({ token: jwtToken, user: toUserPayload(user) });
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!emailRaw || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailRaw);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
  }

  // Check email verification (only enforce if SMTP is configured, or if user was created when SMTP was active)
  if (!user.email_verified && isEmailReady()) {
    return res.status(403).json({
      error: 'Please verify your email before logging in.',
      requiresVerification: true,
      email: user.email,
    });
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now'), last_login_ip = ?, login_count = COALESCE(login_count, 0) + 1 WHERE id = ?")
    .run(clientIp(req), user.id);

  const token = generateToken(user.id);
  res.json({ token, user: toUserPayload(user) });
});

// GET /api/auth/verify?token=xxx
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token is required.' });

  const record = db.prepare(
    "SELECT * FROM verification_tokens WHERE token = ? AND type = 'email' AND used = 0"
  ).get(token);

  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired verification link.' });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });
  }

  // Mark email as verified
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(record.user_id);
  db.prepare('UPDATE verification_tokens SET used = 1 WHERE id = ?').run(record.id);

  const user = db.prepare('SELECT id, name, email, role, status, email_verified FROM users WHERE id = ?').get(record.user_id);
  const jwtToken = generateToken(record.user_id);

  res.json({
    success: true,
    message: 'Email verified successfully! You can now log in.',
    token: jwtToken,
    user: toUserPayload(user),
  });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', resendLimiter, async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!emailRaw) return res.status(400).json({ error: 'Email is required.' });

  const user = db.prepare('SELECT id, name, email, email_verified FROM users WHERE email = ?').get(emailRaw);
  if (!user) return res.json({ message: 'If an account exists, a verification email will be sent.' });

  if (user.email_verified) {
    return res.json({ message: 'Email is already verified. You can log in.' });
  }

  if (!isEmailReady()) {
    // Auto-verify if SMTP isn't configured
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
    return res.json({ message: 'Account has been verified. You can now log in.', autoVerified: true });
  }

  // Invalidate old tokens
  db.prepare("UPDATE verification_tokens SET used = 1 WHERE user_id = ? AND type = 'email' AND used = 0").run(user.id);

  // Create new token
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)')
    .run(user.id, token, 'email', expiresAt);

  await sendVerificationEmail(user.email, user.name, token);
  res.json({ message: 'Verification email sent! Check your inbox.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, status, email_verified, created_at, last_login_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...toUserPayload(user), created_at: user.created_at, last_login_at: user.last_login_at });
});

module.exports = router;
