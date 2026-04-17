const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/medications
router.get('/', authenticate, (req, res) => {
  const meds = db.prepare('SELECT * FROM medications WHERE user_id = ? AND is_active = 1 ORDER BY time_of_day, name').all(req.userId);
  res.json(meds);
});

// GET /api/medications/today
router.get('/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const meds = db.prepare('SELECT * FROM medications WHERE user_id = ? AND is_active = 1 ORDER BY time_of_day, name').all(req.userId);

  const result = meds.map(m => {
    const log = db.prepare('SELECT * FROM medication_logs WHERE medication_id = ? AND taken_date = ?').get(m.id, today);
    return { ...m, taken: !!log, takenAt: log?.taken_at || null };
  });

  res.json(result);
});

// POST /api/medications
router.post('/', authenticate, (req, res) => {
  const { name, dosage, frequency, timeOfDay } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  const id = genId();
  db.prepare('INSERT INTO medications (id, user_id, name, dosage, frequency, time_of_day) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, dosage || null, frequency || 'daily', timeOfDay || 'morning');

  res.status(201).json({ id, name, dosage, frequency: frequency || 'daily', time_of_day: timeOfDay || 'morning', is_active: 1 });
});

// PUT /api/medications/:id
router.put('/:id', authenticate, (req, res) => {
  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  const { name, dosage, frequency, timeOfDay, isActive } = req.body;
  db.prepare('UPDATE medications SET name = ?, dosage = ?, frequency = ?, time_of_day = ?, is_active = ? WHERE id = ?')
    .run(name ?? med.name, dosage ?? med.dosage, frequency ?? med.frequency, timeOfDay ?? med.time_of_day, isActive ?? med.is_active, med.id);

  res.json({ ...med, name: name ?? med.name, dosage: dosage ?? med.dosage, frequency: frequency ?? med.frequency, time_of_day: timeOfDay ?? med.time_of_day, is_active: isActive ?? med.is_active });
});

// DELETE /api/medications/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Medication not found.' });
  res.json({ success: true });
});

// PUT /api/medications/:id/log — mark as taken
router.put('/:id/log', authenticate, (req, res) => {
  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  const date = req.body.date || new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });

  const existing = db.prepare('SELECT 1 FROM medication_logs WHERE medication_id = ? AND taken_date = ?').get(med.id, date);
  if (existing) {
    // Toggle off
    db.prepare('DELETE FROM medication_logs WHERE medication_id = ? AND taken_date = ?').run(med.id, date);
    return res.json({ taken: false, date });
  }

  db.prepare('INSERT INTO medication_logs (medication_id, user_id, taken_date, taken_at) VALUES (?, ?, ?, ?)')
    .run(med.id, req.userId, date, time);
  res.json({ taken: true, date, takenAt: time });
});

module.exports = router;
