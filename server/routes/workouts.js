const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToWorkout(r) {
  return {
    id: r.id,
    exercise: r.exercise,
    sets: r.sets,
    reps: r.reps,
    weight: r.weight,
    duration: r.duration,
    done: !!r.done,
    date: r.date,
    createdAt: r.created_at,
  };
}

// GET /api/workouts
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(rowToWorkout));
});

// POST /api/workouts
router.post('/', (req, res) => {
  const { exercise, sets, reps, weight, duration } = req.body;
  if (!exercise) return res.status(400).json({ error: 'Exercise is required.' });

  const id = genId();
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  db.prepare(
    'INSERT INTO workouts (id, user_id, exercise, sets, reps, weight, duration, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, exercise, sets || 3, reps || 10, weight || null, duration || null, date);

  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  res.json(rowToWorkout(row));
});

// PUT /api/workouts/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Workout not found' });

  const { exercise, sets, reps, weight, duration, done } = req.body;
  db.prepare(
    'UPDATE workouts SET exercise=?, sets=?, reps=?, weight=?, duration=?, done=? WHERE id=? AND user_id=?'
  ).run(
    exercise !== undefined ? exercise : existing.exercise,
    sets !== undefined ? sets : existing.sets,
    reps !== undefined ? reps : existing.reps,
    weight !== undefined ? weight : existing.weight,
    duration !== undefined ? duration : existing.duration,
    done !== undefined ? (done ? 1 : 0) : existing.done,
    req.params.id, req.userId
  );

  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  res.json(rowToWorkout(row));
});

// DELETE /api/workouts/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
