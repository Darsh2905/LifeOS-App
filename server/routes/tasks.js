const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const taskSync = require('../services/taskSync');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toClient(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date,
    recurring: row.recurring,
    lastCompletedAt: row.last_completed_at,
    createdAt: row.created_at?.split('T')[0] || row.created_at?.split(' ')[0],
  };
}

// GET /api/tasks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(toClient));
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { title, priority, dueDate, recurring, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const id = genId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO tasks (id, user_id, title, status, priority, category, due_date, recurring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, title, 'todo', priority || 'medium', category || 'Work', dueDate || null, recurring || 'none', now, now);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(toClient(row));

  if (row.due_date) taskSync.syncTask(req.userId, row);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, status, priority, category, dueDate, recurring, lastCompletedAt } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE tasks SET title=?, status=?, priority=?, category=?, due_date=?, recurring=?, last_completed_at=?, updated_at=? WHERE id=? AND user_id=?'
  ).run(
    title !== undefined ? title : existing.title,
    status !== undefined ? status : existing.status,
    priority !== undefined ? priority : existing.priority,
    category !== undefined ? category : existing.category,
    dueDate !== undefined ? dueDate : existing.due_date,
    recurring !== undefined ? recurring : existing.recurring,
    lastCompletedAt !== undefined ? lastCompletedAt : existing.last_completed_at,
    now, req.params.id, req.userId
  );

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(toClient(row));

  const becameDone = row.status === 'done' && existing.status !== 'done';
  if (becameDone) {
    taskSync.deleteTaskEvent(req.userId, row.id);
  } else {
    taskSync.syncTask(req.userId, row);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
  taskSync.deleteTaskEvent(req.userId, req.params.id);
});

module.exports = router;
