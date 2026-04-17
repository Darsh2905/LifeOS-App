const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/transactions?month=2026-04&type=expense&category=food&search=grocery&limit=50&offset=0
router.get('/', (req, res) => {
  const { month, type, category, search, account_id, limit = 200, offset = 0 } = req.query;
  let sql = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [req.userId];

  if (month) {
    sql += " AND date LIKE ? || '%'";
    params.push(month);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (account_id) {
    sql += ' AND account_id = ?';
    params.push(account_id);
  }
  if (search) {
    sql += ' AND description LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/transactions/summary?months=6
router.get('/summary', (req, res) => {
  const months = Number(req.query.months) || 6;
  const now = new Date();

  // Monthly trend
  const trend = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });

    const incRow = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date LIKE ? || '%'"
    ).get(req.userId, key);
    const expRow = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'"
    ).get(req.userId, key);

    trend.push({ month: monthLabel, key, income: incRow.total, expenses: expRow.total });
  }

  // Current month totals
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyIncome = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date LIKE ? || '%'"
  ).get(req.userId, currentKey).total;
  const monthlyExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'"
  ).get(req.userId, currentKey).total;

  // Expenses by category (current month)
  const categoryBreakdown = db.prepare(
    "SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%' GROUP BY category ORDER BY total DESC"
  ).all(req.userId, currentKey);

  // All-time totals
  const allIncome = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'income'"
  ).get(req.userId).total;
  const allExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'expense'"
  ).get(req.userId).total;

  // Daily average spending (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const last30 = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ?"
  ).get(req.userId, thirtyDaysAgo).total;
  const dailyAvg = last30 / 30;

  // Top spending day this month
  const topDay = db.prepare(
    "SELECT date, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%' GROUP BY date ORDER BY total DESC LIMIT 1"
  ).get(req.userId, currentKey);

  res.json({
    monthlyIncome,
    monthlyExpenses,
    balance: monthlyIncome - monthlyExpenses,
    allTimeIncome: allIncome,
    allTimeExpenses: allExpenses,
    netWorth: allIncome - allExpenses,
    savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0,
    dailyAvg,
    topSpendingDay: topDay || null,
    categoryBreakdown,
    monthlyTrend: trend,
  });
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { type, amount, description, category, date, account_id } = req.body;
  if (!type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Type and positive amount are required.' });
  }

  const id = genId();
  const txDate = date || new Date().toISOString().split('T')[0];

  db.prepare(
    'INSERT INTO transactions (id, user_id, account_id, type, amount, description, category, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, account_id || null, type, amount, description || '', category || 'other', txDate);

  // Update account balance
  if (account_id) {
    const delta = type === 'income' ? amount : -amount;
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?').run(delta, account_id, req.userId);
  }

  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  res.json(tx);
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { type, amount, description, category, date, account_id } = req.body;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  // Reverse old account balance
  if (existing.account_id) {
    const oldDelta = existing.type === 'income' ? -existing.amount : existing.amount;
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?').run(oldDelta, existing.account_id, req.userId);
  }

  db.prepare(
    'UPDATE transactions SET type=?, amount=?, description=?, category=?, date=?, account_id=? WHERE id=? AND user_id=?'
  ).run(
    type || existing.type,
    amount || existing.amount,
    description !== undefined ? description : existing.description,
    category || existing.category,
    date || existing.date,
    account_id !== undefined ? account_id : existing.account_id,
    req.params.id,
    req.userId
  );

  // Apply new account balance
  const newAccId = account_id !== undefined ? account_id : existing.account_id;
  if (newAccId) {
    const newType = type || existing.type;
    const newAmount = amount || existing.amount;
    const newDelta = newType === 'income' ? newAmount : -newAmount;
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?').run(newDelta, newAccId, req.userId);
  }

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  // Reverse account balance
  if (existing.account_id) {
    const delta = existing.type === 'income' ? -existing.amount : existing.amount;
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?').run(delta, existing.account_id, req.userId);
  }

  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// POST /api/transactions/export
router.get('/export', (req, res) => {
  const { month } = req.query;
  let sql = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [req.userId];

  if (month) {
    sql += " AND date LIKE ? || '%'";
    params.push(month);
  }
  sql += ' ORDER BY date DESC';

  const rows = db.prepare(sql).all(...params);

  const header = 'Date,Type,Category,Description,Amount\n';
  const csv = header + rows.map(r =>
    `${r.date},${r.type},${r.category},"${(r.description || '').replace(/"/g, '""')}",${r.amount}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=lifeos-transactions-${month || 'all'}.csv`);
  res.send(csv);
});

module.exports = router;
