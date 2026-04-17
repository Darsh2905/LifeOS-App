const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function computeProgress(goalId, userId) {
  const milestones = db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? AND user_id = ?').all(goalId, userId);
  if (milestones.length === 0) return 0;

  let completed = 0;
  for (const m of milestones) {
    if (m.completed) {
      completed++;
    } else if (m.linked_type && m.linked_id) {
      // Check linked entity status
      let done = false;
      if (m.linked_type === 'task') {
        done = !!db.prepare("SELECT 1 FROM tasks WHERE id = ? AND status = 'done'").get(m.linked_id);
      } else if (m.linked_type === 'habit') {
        const completions = db.prepare('SELECT COUNT(*) as c FROM habit_completions WHERE habit_id = ? AND completed_date >= date(\'now\', \'-30 days\')').get(m.linked_id);
        done = completions && completions.c >= 20; // 20 out of 30 days
      } else if (m.linked_type === 'savings_goal') {
        const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(m.linked_id);
        done = goal && goal.current_amount >= goal.target_amount;
      }
      if (done) completed++;
    }
  }

  return Math.round((completed / milestones.length) * 100);
}

// GET /api/goals
router.get('/', authenticate, (req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);

  const result = goals.map(g => {
    const milestones = db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY sort_order').all(g.id);
    const progress = computeProgress(g.id, req.userId);

    // Update stored progress
    if (progress !== g.progress) {
      db.prepare('UPDATE goals SET progress = ? WHERE id = ?').run(progress, g.id);
    }

    return { ...g, progress, milestones };
  });

  res.json(result);
});

// POST /api/goals
router.post('/', authenticate, (req, res) => {
  const { title, description, category, targetDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const id = genId();
  db.prepare('INSERT INTO goals (id, user_id, title, description, category, target_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, title, description || '', category || 'personal', targetDate || null);

  res.status(201).json({ id, title, description: description || '', category: category || 'personal', target_date: targetDate, status: 'active', progress: 0, milestones: [] });
});

// PUT /api/goals/:id
router.put('/:id', authenticate, (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found.' });

  const { title, description, category, targetDate, status } = req.body;
  db.prepare("UPDATE goals SET title = ?, description = ?, category = ?, target_date = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(title ?? goal.title, description ?? goal.description, category ?? goal.category, targetDate ?? goal.target_date, status ?? goal.status, goal.id);

  const milestones = db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY sort_order').all(goal.id);
  res.json({ ...goal, title: title ?? goal.title, description: description ?? goal.description, category: category ?? goal.category, target_date: targetDate ?? goal.target_date, status: status ?? goal.status, milestones });
});

// DELETE /api/goals/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Goal not found.' });
  res.json({ success: true });
});

// POST /api/goals/:id/milestones
router.post('/:id/milestones', authenticate, (req, res) => {
  const goal = db.prepare('SELECT 1 FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found.' });

  const { title, linkedType, linkedId, sortOrder } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const id = genId();
  db.prepare('INSERT INTO goal_milestones (id, goal_id, user_id, title, linked_type, linked_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.userId, title, linkedType || null, linkedId || null, sortOrder || 0);

  res.status(201).json({ id, goal_id: req.params.id, title, completed: 0, linked_type: linkedType, linked_id: linkedId, sort_order: sortOrder || 0 });
});

// PUT /api/goals/:goalId/milestones/:id
router.put('/:goalId/milestones/:id', authenticate, (req, res) => {
  const milestone = db.prepare('SELECT * FROM goal_milestones WHERE id = ? AND goal_id = ? AND user_id = ?').get(req.params.id, req.params.goalId, req.userId);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });

  const { title, completed, linkedType, linkedId, sortOrder } = req.body;
  db.prepare('UPDATE goal_milestones SET title = ?, completed = ?, linked_type = ?, linked_id = ?, sort_order = ? WHERE id = ?')
    .run(title ?? milestone.title, completed ?? milestone.completed, linkedType ?? milestone.linked_type, linkedId ?? milestone.linked_id, sortOrder ?? milestone.sort_order, milestone.id);

  res.json({ ...milestone, title: title ?? milestone.title, completed: completed ?? milestone.completed });
});

// DELETE /api/goals/:goalId/milestones/:id
router.delete('/:goalId/milestones/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM goal_milestones WHERE id = ? AND goal_id = ? AND user_id = ?').run(req.params.id, req.params.goalId, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Milestone not found.' });
  res.json({ success: true });
});

module.exports = router;
