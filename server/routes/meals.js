const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToMeal(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    calories: r.calories,
    eaten: !!r.eaten,
    date: r.date,
    createdAt: r.created_at,
  };
}

// GET /api/meals
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(rowToMeal));
});

// POST /api/meals
router.post('/', (req, res) => {
  const { name, type, calories } = req.body;
  if (!name) return res.status(400).json({ error: 'Meal name is required.' });

  const id = genId();
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  db.prepare(
    'INSERT INTO meals (id, user_id, name, type, calories, date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, name, type || '🍳 Breakfast', calories || null, date);

  const row = db.prepare('SELECT * FROM meals WHERE id = ?').get(id);
  res.json(rowToMeal(row));
});

// PUT /api/meals/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Meal not found' });

  const { name, type, calories, eaten } = req.body;
  db.prepare(
    'UPDATE meals SET name=?, type=?, calories=?, eaten=? WHERE id=? AND user_id=?'
  ).run(
    name !== undefined ? name : existing.name,
    type !== undefined ? type : existing.type,
    calories !== undefined ? calories : existing.calories,
    eaten !== undefined ? (eaten ? 1 : 0) : existing.eaten,
    req.params.id, req.userId
  );

  const row = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  res.json(rowToMeal(row));
});

// DELETE /api/meals/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM meals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
