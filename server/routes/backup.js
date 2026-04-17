const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const TABLES = [
  'tasks', 'notes', 'habits', 'habit_completions', 'journal_entries',
  'transactions', 'accounts', 'budgets', 'savings_goals', 'recurring_transactions',
  'workouts', 'meals', 'timer_sessions', 'daily_plans',
  'sleep_logs', 'water_logs', 'books', 'quick_captures', 'medications', 'medication_logs',
  'goals', 'goal_milestones', 'user_settings', 'streaks', 'achievements', 'user_xp',
];

// GET /api/backup/export
router.get('/export', authenticate, (req, res) => {
  const data = { version: 1, exportedAt: new Date().toISOString() };

  for (const table of TABLES) {
    try {
      if (table === 'user_xp') {
        data[table] = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(req.userId);
      } else if (table === 'medication_logs' || table === 'habit_completions') {
        data[table] = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(req.userId);
      } else if (table === 'goal_milestones') {
        data[table] = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(req.userId);
      } else {
        data[table] = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(req.userId);
      }
    } catch (err) {
      data[table] = [];
    }
  }

  res.setHeader('Content-Disposition', `attachment; filename=lifeos-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.json(data);
});

// POST /api/backup/import
router.post('/import', authenticate, (req, res) => {
  const data = req.body;
  if (!data || !data.version) {
    return res.status(400).json({ error: 'Invalid backup file. Missing version field.' });
  }

  const importTx = db.transaction(() => {
    // Delete all existing user data (in reverse dependency order)
    const deleteTables = [
      'medication_logs', 'medications', 'quick_captures', 'books', 'water_logs', 'sleep_logs',
      'goal_milestones', 'goals', 'achievements', 'streaks', 'user_xp', 'user_settings',
      'daily_plans', 'timer_sessions', 'meals', 'workouts', 'journal_entries',
      'habit_completions', 'habits', 'notes',
      'recurring_transactions', 'savings_goals', 'budgets', 'transactions', 'accounts',
      'ai_briefings', 'ai_conversations', 'dismissed_suggestions', 'activity_log',
    ];

    for (const table of deleteTables) {
      try {
        if (table === 'user_xp') {
          db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(req.userId);
        } else {
          db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(req.userId);
        }
      } catch (e) { /* table may not exist yet */ }
    }

    // Re-insert from backup
    let imported = 0;
    for (const table of TABLES) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        // Ensure user_id matches current user
        if (row.user_id) row.user_id = req.userId;

        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        try {
          db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...cols.map(c => row[c]));
          imported++;
        } catch (e) {
          // Skip rows that fail (schema mismatch, etc.)
        }
      }
    }
    return imported;
  });

  try {
    const imported = importTx();
    res.json({ success: true, imported });
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: 'Import failed. Your data was not modified.' });
  }
});

module.exports = router;
