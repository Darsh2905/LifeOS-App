const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function enrichHabit(habit, userId) {
  const completions = db.prepare(
    'SELECT completed_date FROM habit_completions WHERE habit_id = ? AND user_id = ?'
  ).all(habit.id, userId);
  return {
    id: habit.id,
    label: habit.label,
    icon: habit.icon,
    color: habit.color,
    completedDays: completions.map(c => c.completed_date),
    createdAt: habit.created_at,
  };
}

// GET /api/habits
router.get('/', (req, res) => {
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC').all(req.userId);
  res.json(habits.map(h => enrichHabit(h, req.userId)));
});

// POST /api/habits
router.post('/', (req, res) => {
  const { label, icon, color } = req.body;
  if (!label) return res.status(400).json({ error: 'Label is required.' });

  const id = genId();
  db.prepare('INSERT INTO habits (id, user_id, label, icon, color) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.userId, label, icon || '', color || '#9333ea');

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
  res.json(enrichHabit(habit, req.userId));
});

// PUT /api/habits/:id/toggle
router.put('/:id/toggle', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required.' });

  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const existing = db.prepare(
    'SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?'
  ).get(req.params.id, date);

  if (existing) {
    db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES (?, ?, ?)')
      .run(req.params.id, req.userId, date);
  }

  res.json(enrichHabit(habit, req.userId));
});

// DELETE /api/habits/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM habit_completions WHERE habit_id = ?').run(req.params.id);
  db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
