const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/timer/sessions — get all session counts
router.get('/sessions', (req, res) => {
  const rows = db.prepare('SELECT session_date, count FROM timer_sessions WHERE user_id = ?').all(req.userId);
  const sessions = {};
  for (const r of rows) {
    sessions[r.session_date] = r.count;
  }
  res.json(sessions);
});

// POST /api/timer/sessions — record or increment a session for a date
router.post('/sessions', (req, res) => {
  const { date, focusDuration } = req.body;
  const sessionDate = date || new Date().toISOString().split('T')[0];

  const existing = db.prepare(
    'SELECT * FROM timer_sessions WHERE user_id = ? AND session_date = ?'
  ).get(req.userId, sessionDate);

  if (existing) {
    db.prepare('UPDATE timer_sessions SET count = count + 1 WHERE id = ?').run(existing.id);
  } else {
    const id = genId();
    db.prepare(
      'INSERT INTO timer_sessions (id, user_id, session_date, count, focus_duration) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.userId, sessionDate, 1, focusDuration || 3600);
  }

  // Return all sessions
  const rows = db.prepare('SELECT session_date, count FROM timer_sessions WHERE user_id = ?').all(req.userId);
  const sessions = {};
  for (const r of rows) {
    sessions[r.session_date] = r.count;
  }
  res.json(sessions);
});

module.exports = router;
