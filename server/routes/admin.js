const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Per-user counts across modules — single grouped query via UNION ALL
function userCountsMap() {
  const rows = db.prepare(`
    SELECT user_id, 'tasks' AS kind, COUNT(*) AS n FROM tasks GROUP BY user_id
    UNION ALL SELECT user_id, 'notes', COUNT(*) FROM notes GROUP BY user_id
    UNION ALL SELECT user_id, 'habits', COUNT(*) FROM habits GROUP BY user_id
    UNION ALL SELECT user_id, 'journal', COUNT(*) FROM journal_entries GROUP BY user_id
    UNION ALL SELECT user_id, 'workouts', COUNT(*) FROM workouts GROUP BY user_id
    UNION ALL SELECT user_id, 'meals', COUNT(*) FROM meals GROUP BY user_id
    UNION ALL SELECT user_id, 'transactions', COUNT(*) FROM transactions GROUP BY user_id
    UNION ALL SELECT user_id, 'sleep', COUNT(*) FROM sleep_logs GROUP BY user_id
    UNION ALL SELECT user_id, 'goals', COUNT(*) FROM goals GROUP BY user_id
  `).all();
  const map = new Map();
  for (const r of rows) {
    const entry = map.get(r.user_id) || {};
    entry[r.kind] = r.n;
    map.set(r.user_id, entry);
  }
  return map;
}

// GET /api/admin/users?search=&role=&status=
router.get('/users', (req, res) => {
  const { search = '', role, status } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)');
    const q = `%${String(search).toLowerCase()}%`;
    params.push(q, q);
  }
  if (role && ['user', 'admin'].includes(role)) { clauses.push('role = ?'); params.push(role); }
  if (status && ['active', 'suspended'].includes(status)) { clauses.push('status = ?'); params.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const users = db.prepare(`
    SELECT id, name, email, role, status, created_at, last_login_at, last_login_ip, login_count
    FROM users ${where}
    ORDER BY datetime(created_at) DESC
  `).all(...params);

  const counts = userCountsMap();
  res.json(users.map(u => ({ ...u, counts: counts.get(u.id) || {} })));
});

// GET /api/admin/users/:id
router.get('/users/:id', (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, role, status, created_at, last_login_at, last_login_ip, login_count
    FROM users WHERE id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const counts = userCountsMap().get(user.id) || {};
  const recentActivity = db.prepare(
    'SELECT action, module, summary, created_at FROM activity_log WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 20'
  ).all(user.id);

  res.json({ ...user, counts, recentActivity });
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "suspended".' });
  }
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'You cannot change your own status.' });
  }
  const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, status });
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "admin".' });
  }
  if (req.params.id === req.userId && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote yourself.' });
  }
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, role });
});

// DELETE /api/admin/users/:id — cascades via FKs
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account from the admin panel.' });
  }
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Refuse to delete the last remaining admin
  if (user.role === 'admin') {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get();
    if (n <= 1) return res.status(400).json({ error: 'Cannot delete the last remaining admin.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/stats — global counts & recent signups
router.get('/stats', (_req, res) => {
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
      (SELECT COUNT(*) FROM users WHERE status = 'suspended') AS suspended,
      (SELECT COUNT(*) FROM users WHERE datetime(last_login_at) >= datetime('now','-7 days')) AS activeWeek,
      (SELECT COUNT(*) FROM users WHERE datetime(created_at) >= datetime('now','-7 days')) AS newWeek,
      (SELECT COUNT(*) FROM tasks) AS tasks,
      (SELECT COUNT(*) FROM notes) AS notes,
      (SELECT COUNT(*) FROM transactions) AS transactions
  `).get();

  // Signups per day for the last 14 days (used for a sparkline on the admin page)
  const signups = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS n
    FROM users
    WHERE datetime(created_at) >= datetime('now','-14 days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all();

  res.json({ totals, signups });
});

module.exports = router;
