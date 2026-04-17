const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/savings
router.get('/', (req, res) => {
  const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const enriched = goals.map(g => ({
    ...g,
    percentage: g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0,
    remaining: Math.max(g.target_amount - g.current_amount, 0),
  }));
  res.json(enriched);
});

// POST /api/savings
router.post('/', (req, res) => {
  const { name, target_amount, current_amount, deadline, color, icon } = req.body;
  if (!name || !target_amount || target_amount <= 0) {
    return res.status(400).json({ error: 'Name and positive target amount required.' });
  }

  const id = genId();
  db.prepare(
    'INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, name, target_amount, current_amount || 0, deadline || null, color || '#9333ea', icon || 'piggy-bank');

  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
  res.json({ ...goal, percentage: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0, remaining: goal.target_amount - goal.current_amount });
});

// PUT /api/savings/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Goal not found' });

  const { name, target_amount, current_amount, deadline, color, icon } = req.body;
  db.prepare(
    'UPDATE savings_goals SET name=?, target_amount=?, current_amount=?, deadline=?, color=?, icon=? WHERE id=? AND user_id=?'
  ).run(
    name || existing.name,
    target_amount !== undefined ? target_amount : existing.target_amount,
    current_amount !== undefined ? current_amount : existing.current_amount,
    deadline !== undefined ? deadline : existing.deadline,
    color || existing.color,
    icon || existing.icon,
    req.params.id,
    req.userId
  );

  const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
  res.json({ ...updated, percentage: updated.target_amount > 0 ? (updated.current_amount / updated.target_amount) * 100 : 0, remaining: updated.target_amount - updated.current_amount });
});

// PUT /api/savings/:id/contribute
router.put('/:id/contribute', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Positive amount required.' });

  const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Goal not found' });

  const newAmount = Math.min(existing.current_amount + amount, existing.target_amount);
  db.prepare('UPDATE savings_goals SET current_amount = ? WHERE id = ?').run(newAmount, req.params.id);

  const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
  res.json({ ...updated, percentage: updated.target_amount > 0 ? (updated.current_amount / updated.target_amount) * 100 : 0, remaining: updated.target_amount - updated.current_amount });
});

// DELETE /api/savings/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
