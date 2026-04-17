const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function calcDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60; // next day
  return wakeMin - bedMin;
}

// GET /api/sleep?date=YYYY-MM-DD
router.get('/', authenticate, (req, res) => {
  if (req.query.date) {
    const log = db.prepare('SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?').get(req.userId, req.query.date);
    return res.json(log || null);
  }
  const logs = db.prepare('SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(req.userId);
  res.json(logs);
});

// GET /api/sleep/range?start=...&end=...
router.get('/range', authenticate, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required.' });
  const logs = db.prepare('SELECT * FROM sleep_logs WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date').all(req.userId, start, end);
  res.json(logs);
});

// POST /api/sleep
router.post('/', authenticate, (req, res) => {
  const { date, bedtime, wakeTime, quality, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required.' });

  const duration = req.body.durationMinutes || calcDuration(bedtime, wakeTime);

  const existing = db.prepare('SELECT id FROM sleep_logs WHERE user_id = ? AND date = ?').get(req.userId, date);
  if (existing) {
    db.prepare('UPDATE sleep_logs SET bedtime = ?, wake_time = ?, duration_minutes = ?, quality = ?, notes = ? WHERE id = ?')
      .run(bedtime || null, wakeTime || null, duration, quality || null, notes || null, existing.id);
    return res.json({ id: existing.id, date, bedtime, wakeTime, duration_minutes: duration, quality, notes });
  }

  const id = genId();
  db.prepare('INSERT INTO sleep_logs (id, user_id, date, bedtime, wake_time, duration_minutes, quality, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, date, bedtime || null, wakeTime || null, duration, quality || null, notes || null);
  res.status(201).json({ id, date, bedtime, wakeTime, duration_minutes: duration, quality, notes });
});

// PUT /api/sleep/:id
router.put('/:id', authenticate, (req, res) => {
  const log = db.prepare('SELECT * FROM sleep_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!log) return res.status(404).json({ error: 'Sleep log not found.' });

  const { bedtime, wakeTime, quality, notes } = req.body;
  const duration = req.body.durationMinutes || calcDuration(bedtime ?? log.bedtime, wakeTime ?? log.wake_time) || log.duration_minutes;

  db.prepare('UPDATE sleep_logs SET bedtime = ?, wake_time = ?, duration_minutes = ?, quality = ?, notes = ? WHERE id = ?')
    .run(bedtime ?? log.bedtime, wakeTime ?? log.wake_time, duration, quality ?? log.quality, notes ?? log.notes, log.id);
  res.json({ ...log, bedtime: bedtime ?? log.bedtime, wake_time: wakeTime ?? log.wake_time, duration_minutes: duration, quality: quality ?? log.quality, notes: notes ?? log.notes });
});

// DELETE /api/sleep/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM sleep_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Sleep log not found.' });
  res.json({ success: true });
});

module.exports = router;
