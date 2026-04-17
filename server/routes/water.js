const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/water?date=YYYY-MM-DD
router.get('/', authenticate, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const logs = db.prepare('SELECT * FROM water_logs WHERE user_id = ? AND date = ? ORDER BY created_at').all(req.userId, date);
  const total = logs.reduce((s, l) => s + l.amount_ml, 0);

  const goalSetting = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'water_goal_ml'").get(req.userId);
  const goal = goalSetting ? parseInt(goalSetting.value) : 2500;

  res.json({ date, logs, total, goal, progress: Math.min(Math.round((total / goal) * 100), 100) });
});

// POST /api/water
router.post('/', authenticate, (req, res) => {
  const { amount_ml, date } = req.body;
  if (!amount_ml || amount_ml <= 0) return res.status(400).json({ error: 'amount_ml is required and must be positive.' });

  const d = date || new Date().toISOString().split('T')[0];
  const id = genId();
  db.prepare('INSERT INTO water_logs (id, user_id, date, amount_ml) VALUES (?, ?, ?, ?)').run(id, req.userId, d, amount_ml);

  // Return updated total
  const total = db.prepare('SELECT SUM(amount_ml) as total FROM water_logs WHERE user_id = ? AND date = ?').get(req.userId, d).total || 0;
  res.status(201).json({ id, date: d, amount_ml, dailyTotal: total });
});

// DELETE /api/water/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM water_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Water log not found.' });
  res.json({ success: true });
});

// GET /api/water/summary?days=7
router.get('/summary', authenticate, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const results = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const total = db.prepare('SELECT SUM(amount_ml) as total FROM water_logs WHERE user_id = ? AND date = ?').get(req.userId, dateStr).total || 0;
    results.push({ date: dateStr, total });
  }
  res.json(results);
});

module.exports = router;
