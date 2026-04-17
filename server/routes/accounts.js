const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/accounts
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY is_default DESC, created_at ASC').all(req.userId);
  res.json(rows);
});

// POST /api/accounts
router.post('/', (req, res) => {
  const { name, type, balance, color, icon } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required.' });

  const id = genId();
  db.prepare(
    'INSERT INTO accounts (id, user_id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, name, type, balance || 0, color || '#9333ea', icon || 'wallet');

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  res.json(account);
});

// PUT /api/accounts/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Account not found' });

  const { name, type, balance, color, icon } = req.body;
  db.prepare(
    'UPDATE accounts SET name=?, type=?, balance=?, color=?, icon=? WHERE id=? AND user_id=?'
  ).run(
    name || existing.name,
    type || existing.type,
    balance !== undefined ? balance : existing.balance,
    color || existing.color,
    icon || existing.icon,
    req.params.id,
    req.userId
  );

  const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Account not found' });
  if (existing.is_default) return res.status(400).json({ error: 'Cannot delete default account' });

  db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
