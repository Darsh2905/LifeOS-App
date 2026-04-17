const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToEntry(r) {
  return {
    id: r.id,
    text: r.text,
    mood: r.mood,
    date: r.date,
    time: r.time,
    createdAt: r.created_at,
  };
}

// GET /api/journal
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(rowToEntry));
});

// POST /api/journal
router.post('/', (req, res) => {
  const { text, mood } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  const id = genId();
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  db.prepare('INSERT INTO journal_entries (id, user_id, text, mood, date, time) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, text, mood || '😊', date, time);

  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
  res.json(rowToEntry(row));
});

// DELETE /api/journal/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
