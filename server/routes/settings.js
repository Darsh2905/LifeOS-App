const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/settings — all settings as key-value object
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(req.userId);
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// PUT /api/settings — upsert a key-value pair
router.put('/', authenticate, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required.' });

  const existing = db.prepare('SELECT id FROM user_settings WHERE user_id = ? AND key = ?').get(req.userId, key);
  if (existing) {
    db.prepare('UPDATE user_settings SET value = ?, updated_at = datetime(\'now\') WHERE id = ?').run(String(value), existing.id);
  } else {
    db.prepare('INSERT INTO user_settings (id, user_id, key, value) VALUES (?, ?, ?, ?)').run(genId(), req.userId, key, String(value));
  }

  res.json({ key, value: String(value) });
});

module.exports = router;
