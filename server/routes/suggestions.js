const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function dateStr(d) { return d.toISOString().split('T')[0]; }

const SUGGESTION_RULES = [
  {
    key: 'no_workout_3days',
    priority: 3,
    module: 'workout',
    cooldownDays: 1,
    check(userId) {
      const threeDaysAgo = dateStr(new Date(Date.now() - 3 * 86400000));
      const count = db.prepare(
        'SELECT COUNT(*) as c FROM workouts WHERE user_id = ? AND done = 1 AND date >= ?'
      ).get(userId, threeDaysAgo).c;
      if (count === 0) return { active: true, message: "You haven't worked out in 3+ days. Even a short session helps!" };
      return null;
    },
  },
  {
    key: 'no_journal_week',
    priority: 2,
    module: 'journal',
    cooldownDays: 3,
    check(userId) {
      const weekAgo = dateStr(new Date(Date.now() - 7 * 86400000));
      const count = db.prepare(
        'SELECT COUNT(*) as c FROM journal_entries WHERE user_id = ? AND date >= ?'
      ).get(userId, weekAgo).c;
      if (count === 0) return { active: true, message: "You haven't journaled this week. Writing helps process your thoughts." };
      return null;
    },
  },
  {
    key: 'budget_overrun',
    priority: 4,
    module: 'finance',
    cooldownDays: 7,
    check(userId) {
      const month = new Date().toISOString().slice(0, 7);
      const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ?').all(userId, month);
      for (const b of budgets) {
        const spent = db.prepare(
          "SELECT SUM(amount) as s FROM transactions WHERE user_id = ? AND type = 'expense' AND category = ? AND date LIKE ?"
        ).get(userId, b.category, month + '%');
        const pct = spent?.s ? (spent.s / b.amount) * 100 : 0;
        if (pct >= 90) {
          return { active: true, message: `Your "${b.category}" budget is ${Math.round(pct)}% spent. Tread carefully!` };
        }
      }
      return null;
    },
  },
  {
    key: 'habit_streak_risk',
    priority: 5,
    module: 'habit',
    cooldownDays: 1,
    check(userId) {
      const yesterday = dateStr(new Date(Date.now() - 86400000));
      const today = dateStr(new Date());
      const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
      for (const h of habits) {
        // Check if has streak >= 3
        const streak = db.prepare('SELECT * FROM streaks WHERE user_id = ? AND type = ? AND ref_id = ? AND current_streak >= 3').get(userId, 'habit', h.id);
        if (!streak) continue;
        const doneYesterday = db.prepare('SELECT 1 FROM habit_completions WHERE habit_id = ? AND completed_date = ?').get(h.id, yesterday);
        const doneToday = db.prepare('SELECT 1 FROM habit_completions WHERE habit_id = ? AND completed_date = ?').get(h.id, today);
        if (!doneYesterday && !doneToday) {
          return { active: true, message: `Don't break your ${streak.current_streak}-day streak on "${h.label}"!` };
        }
      }
      return null;
    },
  },
  {
    key: 'low_energy',
    priority: 2,
    module: 'wellness',
    cooldownDays: 3,
    check(userId) {
      const threeDaysAgo = dateStr(new Date(Date.now() - 3 * 86400000));
      const plans = db.prepare(
        'SELECT energy_level FROM daily_plans WHERE user_id = ? AND date >= ? AND energy_level IS NOT NULL'
      ).all(userId, threeDaysAgo);
      if (plans.length >= 2) {
        const avg = plans.reduce((s, p) => s + p.energy_level, 0) / plans.length;
        if (avg < 2) return { active: true, message: "Your energy has been low recently. Consider rest, sleep, or a lighter schedule today." };
      }
      return null;
    },
  },
  {
    key: 'recurring_due',
    priority: 4,
    module: 'finance',
    cooldownDays: 1,
    check(userId) {
      const today = dateStr(new Date());
      const due = db.prepare(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1 AND next_due <= ?'
      ).all(userId, today);
      if (due.length > 0) {
        return { active: true, message: `You have ${due.length} recurring transaction(s) due: ${due.map(d => d.description).join(', ')}` };
      }
      return null;
    },
  },
  {
    key: 'no_plan_today',
    priority: 1,
    module: 'planner',
    cooldownDays: 1,
    check(userId) {
      const today = dateStr(new Date());
      const plan = db.prepare('SELECT 1 FROM daily_plans WHERE user_id = ? AND date = ?').get(userId, today);
      if (!plan) return { active: true, message: "You haven't created a plan for today yet. A few minutes of planning boosts productivity!" };
      return null;
    },
  },
  {
    key: 'spending_spike',
    priority: 3,
    module: 'finance',
    cooldownDays: 7,
    check(userId) {
      const today = new Date();
      const weekStart = dateStr(new Date(today.getTime() - 7 * 86400000));
      const fourWeeksAgo = dateStr(new Date(today.getTime() - 28 * 86400000));

      const thisWeek = db.prepare(
        "SELECT SUM(amount) as s FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ?"
      ).get(userId, weekStart);

      const prevWeeks = db.prepare(
        "SELECT SUM(amount) as s FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ?"
      ).get(userId, fourWeeksAgo, weekStart);

      const weeklyAvg = (prevWeeks?.s || 0) / 3;
      if (weeklyAvg > 0 && thisWeek?.s > weeklyAvg * 1.5) {
        return { active: true, message: `This week's spending is ${Math.round((thisWeek.s / weeklyAvg - 1) * 100)}% above your 4-week average.` };
      }
      return null;
    },
  },
  {
    key: 'meal_gap',
    priority: 1,
    module: 'meal',
    cooldownDays: 1,
    check(userId) {
      const today = dateStr(new Date());
      const hour = new Date().getHours();
      if (hour >= 12) {
        const meals = db.prepare('SELECT COUNT(*) as c FROM meals WHERE user_id = ? AND date = ?').get(userId, today).c;
        if (meals === 0) return { active: true, message: "No meals logged today. Track your meals to stay on top of nutrition!" };
      }
      return null;
    },
  },
  {
    key: 'task_overload',
    priority: 2,
    module: 'task',
    cooldownDays: 3,
    check(userId) {
      const todo = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'todo'").get(userId).c;
      if (todo > 10) return { active: true, message: `You have ${todo} tasks in your backlog. Consider prioritizing or clearing low-priority items.` };
      return null;
    },
  },
];

// GET /api/suggestions
router.get('/', authenticate, (req, res) => {
  const results = [];

  for (const rule of SUGGESTION_RULES) {
    // Check if dismissed within cooldown
    const dismissed = db.prepare(
      'SELECT dismissed_at FROM dismissed_suggestions WHERE user_id = ? AND suggestion_key = ?'
    ).get(req.userId, rule.key);

    if (dismissed) {
      const dismissedAge = (Date.now() - new Date(dismissed.dismissed_at).getTime()) / 86400000;
      if (dismissedAge < rule.cooldownDays) continue;
    }

    try {
      const result = rule.check(req.userId);
      if (result) {
        results.push({
          key: rule.key,
          priority: rule.priority,
          module: rule.module,
          message: result.message,
        });
      }
    } catch (err) {
      console.error(`Suggestion rule ${rule.key} error:`, err.message);
    }
  }

  // Sort by priority (higher = more important), take top 5
  results.sort((a, b) => b.priority - a.priority);
  res.json(results.slice(0, 5));
});

// POST /api/suggestions/:key/dismiss
router.post('/:key/dismiss', authenticate, (req, res) => {
  const { key } = req.params;
  db.prepare(
    "INSERT OR REPLACE INTO dismissed_suggestions (user_id, suggestion_key, dismissed_at) VALUES (?, ?, datetime('now'))"
  ).run(req.userId, key);
  res.json({ success: true });
});

module.exports = router;
