const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToPlan(r) {
  return {
    id: r.id,
    date: r.date,
    topPriorities: JSON.parse(r.top_priorities || '[]'),
    schedule: JSON.parse(r.schedule || '[]'),
    notes: r.notes,
    energyLevel: r.energy_level,
    reflection: r.reflection,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/planner?date=2026-04-13
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const row = db.prepare('SELECT * FROM daily_plans WHERE user_id = ? AND date = ?').get(req.userId, date);
  if (!row) return res.json(null);
  res.json(rowToPlan(row));
});

// GET /api/planner/range?start=2026-04-07&end=2026-04-13
router.get('/range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end dates required.' });

  const rows = db.prepare(
    'SELECT * FROM daily_plans WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC'
  ).all(req.userId, start, end);
  res.json(rows.map(rowToPlan));
});

// PUT /api/planner — upsert a daily plan
router.put('/', (req, res) => {
  const { date, topPriorities, schedule, notes, energyLevel, reflection } = req.body;
  const planDate = date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM daily_plans WHERE user_id = ? AND date = ?').get(req.userId, planDate);

  if (existing) {
    db.prepare(
      'UPDATE daily_plans SET top_priorities=?, schedule=?, notes=?, energy_level=?, reflection=?, updated_at=? WHERE id=?'
    ).run(
      topPriorities !== undefined ? JSON.stringify(topPriorities) : existing.top_priorities,
      schedule !== undefined ? JSON.stringify(schedule) : existing.schedule,
      notes !== undefined ? notes : existing.notes,
      energyLevel !== undefined ? energyLevel : existing.energy_level,
      reflection !== undefined ? reflection : existing.reflection,
      now, existing.id
    );
    const row = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(existing.id);
    return res.json(rowToPlan(row));
  }

  const id = genId();
  db.prepare(
    'INSERT INTO daily_plans (id, user_id, date, top_priorities, schedule, notes, energy_level, reflection, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, req.userId, planDate,
    JSON.stringify(topPriorities || []),
    JSON.stringify(schedule || []),
    notes || '',
    energyLevel || null,
    reflection || '',
    now, now
  );

  const row = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(id);
  res.json(rowToPlan(row));
});

module.exports = router;
