const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper to log activity from other routes
function logActivity(userId, action, module, entityId, summary) {
  try {
    db.prepare('INSERT INTO activity_log (user_id, action, module, entity_id, summary) VALUES (?, ?, ?, ?, ?)')
      .run(userId, action, module, entityId || null, summary);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

// GET /api/activity?limit=50&offset=0&module=task
router.get('/', authenticate, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const module = req.query.module;

  let activities;
  if (module) {
    activities = db.prepare(
      'SELECT * FROM activity_log WHERE user_id = ? AND module = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(req.userId, module, limit, offset);
  } else {
    activities = db.prepare(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(req.userId, limit, offset);
  }

  res.json(activities);
});

// GET /api/activity/today
router.get('/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const activities = db.prepare(
    "SELECT module, COUNT(*) as count FROM activity_log WHERE user_id = ? AND created_at >= ? GROUP BY module"
  ).all(req.userId, today);

  const total = activities.reduce((s, a) => s + a.count, 0);
  res.json({ total, byModule: activities });
});

module.exports = router;
module.exports.logActivity = logActivity;
