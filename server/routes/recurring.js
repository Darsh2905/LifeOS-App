const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/recurring
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY next_due ASC').all(req.userId);
  res.json(rows);
});

// POST /api/recurring
router.post('/', (req, res) => {
  const { type, amount, description, category, frequency, next_due, account_id } = req.body;
  if (!type || !amount || !frequency || !next_due) {
    return res.status(400).json({ error: 'Type, amount, frequency, and next_due are required.' });
  }

  const id = genId();
  db.prepare(
    'INSERT INTO recurring_transactions (id, user_id, account_id, type, amount, description, category, frequency, next_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, account_id || null, type, amount, description || '', category || 'other', frequency, next_due);

  const row = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(id);
  res.json(row);
});

// PUT /api/recurring/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

  const { type, amount, description, category, frequency, next_due, is_active, account_id } = req.body;
  db.prepare(
    'UPDATE recurring_transactions SET type=?, amount=?, description=?, category=?, frequency=?, next_due=?, is_active=?, account_id=? WHERE id=? AND user_id=?'
  ).run(
    type || existing.type,
    amount !== undefined ? amount : existing.amount,
    description !== undefined ? description : existing.description,
    category || existing.category,
    frequency || existing.frequency,
    next_due || existing.next_due,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    account_id !== undefined ? account_id : existing.account_id,
    req.params.id,
    req.userId
  );

  const updated = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/recurring/:id/process — manually trigger a recurring transaction
router.post('/:id/process', (req, res) => {
  const rec = db.prepare('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!rec) return res.status(404).json({ error: 'Not found' });

  // Create the transaction
  const txId = genId();
  const today = new Date().toISOString().split('T')[0];
  db.prepare(
    'INSERT INTO transactions (id, user_id, account_id, type, amount, description, category, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(txId, req.userId, rec.account_id, rec.type, rec.amount, rec.description, rec.category, today);

  // Update account balance
  if (rec.account_id) {
    const delta = rec.type === 'income' ? rec.amount : -rec.amount;
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?').run(delta, rec.account_id, req.userId);
  }

  // Advance next_due
  const next = new Date(rec.next_due);
  switch (rec.frequency) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  db.prepare('UPDATE recurring_transactions SET next_due = ? WHERE id = ?')
    .run(next.toISOString().split('T')[0], req.params.id);

  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
  const updatedRec = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(req.params.id);
  res.json({ transaction: tx, recurring: updatedRec });
});

// DELETE /api/recurring/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
