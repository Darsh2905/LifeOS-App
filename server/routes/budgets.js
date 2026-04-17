const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/budgets?month=2026-04
router.get('/', (req, res) => {
  const month = req.query.month || currentMonth();
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ?').all(req.userId, month);

  // Enrich with actual spending
  const enriched = budgets.map(b => {
    const spentRow = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'" +
      (b.category ? ' AND category = ?' : '')
    );
    const params = b.category ? [req.userId, month, b.category] : [req.userId, month];
    const spent = spentRow.get(...params).total;
    return { ...b, spent, remaining: Math.max(b.amount - spent, 0), percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0 };
  });

  res.json(enriched);
});

// POST /api/budgets (upsert)
router.post('/', (req, res) => {
  const { category, amount, month: reqMonth } = req.body;
  if (amount === undefined || amount < 0) return res.status(400).json({ error: 'Valid amount required.' });

  const month = reqMonth || currentMonth();

  const existing = db.prepare(
    'SELECT id FROM budgets WHERE user_id = ? AND category IS ? AND month = ?'
  ).get(req.userId, category || null, month);

  if (existing) {
    db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(amount, existing.id);
  } else {
    const id = genId();
    db.prepare('INSERT INTO budgets (id, user_id, category, amount, month) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.userId, category || null, amount, month);
  }

  // Return all budgets for this month
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ?').all(req.userId, month);
  res.json(budgets);
});

// DELETE /api/budgets/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
