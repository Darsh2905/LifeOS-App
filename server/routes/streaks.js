const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function dateStr(d) { return d.toISOString().split('T')[0]; }

function computeStreak(dates, freezeAllowed = 1) {
  if (!dates.length) return { current: 0, longest: 0 };
  const sorted = [...new Set(dates)].sort().reverse();
  const today = dateStr(new Date());
  const yesterday = dateStr(new Date(Date.now() - 86400000));

  let current = 0;
  let longest = 0;
  let freezeUsed = 0;
  let expectedDate = sorted[0] === today || sorted[0] === yesterday ? new Date(sorted[0]) : null;

  if (!expectedDate) return { current: 0, longest: Math.max(...computeAllStreaks(sorted)) || 0 };

  for (let i = 0; i < 365; i++) {
    const checkDate = dateStr(expectedDate);
    if (sorted.includes(checkDate)) {
      current++;
    } else if (freezeUsed < freezeAllowed) {
      freezeUsed++;
      // Gap day, don't increment but continue
    } else {
      break;
    }
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  // Compute longest from all data
  longest = current;
  let tempStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000;
    if (diff === 1) {
      tempStreak++;
    } else if (diff === 2 && freezeAllowed > 0) {
      tempStreak++; // freeze
    } else {
      longest = Math.max(longest, tempStreak);
      tempStreak = 1;
    }
  }
  longest = Math.max(longest, tempStreak);

  return { current, longest, freezeUsed };
}

function computeAllStreaks(sorted) {
  const streaks = [1];
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000;
    if (diff === 1) streaks[streaks.length - 1]++;
    else streaks.push(1);
  }
  return streaks;
}

// GET /api/streaks — all active streaks
router.get('/', authenticate, (req, res) => {
  const streaks = db.prepare('SELECT * FROM streaks WHERE user_id = ?').all(req.userId);
  const achievements = db.prepare('SELECT * FROM achievements WHERE user_id = ?').all(req.userId);
  const xp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(req.userId) || { total_xp: 0, level: 1 };

  res.json({ streaks, achievements, xp: { totalXp: xp.total_xp, level: xp.level } });
});

// GET /api/streaks/check — recalculate all streaks
router.get('/check', authenticate, (req, res) => {
  const userId = req.userId;
  const newlyUnlocked = [];

  // Habit streaks (per-habit)
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  for (const habit of habits) {
    const dates = db.prepare('SELECT completed_date FROM habit_completions WHERE habit_id = ?').all(habit.id).map(r => r.completed_date);
    const result = computeStreak(dates);
    upsertStreak(userId, 'habit', habit.id, result);
  }

  // Task streak — days with at least 1 task done
  const taskDays = db.prepare(
    "SELECT DISTINCT date(updated_at) as d FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at IS NOT NULL"
  ).all(userId).map(r => r.d).filter(Boolean);
  upsertStreak(userId, 'task', null, computeStreak(taskDays));

  // Journal streak
  const journalDays = db.prepare(
    'SELECT DISTINCT date FROM journal_entries WHERE user_id = ?'
  ).all(userId).map(r => r.date);
  upsertStreak(userId, 'journal', null, computeStreak(journalDays));

  // Workout streak — days with at least 1 completed workout
  const workoutDays = db.prepare(
    'SELECT DISTINCT date FROM workouts WHERE user_id = ? AND done = 1'
  ).all(userId).map(r => r.date);
  upsertStreak(userId, 'workout', null, computeStreak(workoutDays));

  // Focus streak
  const focusDays = db.prepare(
    'SELECT DISTINCT session_date FROM timer_sessions WHERE user_id = ?'
  ).all(userId).map(r => r.session_date);
  upsertStreak(userId, 'focus', null, computeStreak(focusDays));

  // Planner streak
  const plannerDays = db.prepare(
    'SELECT DISTINCT date FROM daily_plans WHERE user_id = ?'
  ).all(userId).map(r => r.date);
  upsertStreak(userId, 'planner', null, computeStreak(plannerDays));

  // Check achievements
  const allStreaks = db.prepare('SELECT * FROM streaks WHERE user_id = ?').all(userId);
  const totalFocusSessions = db.prepare('SELECT SUM(count) as total FROM timer_sessions WHERE user_id = ?').get(userId).total || 0;

  const ACHIEVEMENT_DEFS = [
    { key: 'habit_streak_7', label: '7-Day Habit Streak', icon: '🔥', check: () => allStreaks.some(s => s.type === 'habit' && s.current_streak >= 7) },
    { key: 'habit_streak_30', label: '30-Day Habit Streak', icon: '💎', check: () => allStreaks.some(s => s.type === 'habit' && s.current_streak >= 30) },
    { key: 'habit_streak_100', label: '100-Day Habit Streak', icon: '👑', check: () => allStreaks.some(s => s.type === 'habit' && s.current_streak >= 100) },
    { key: 'task_streak_7', label: '7-Day Task Streak', icon: '✅', check: () => allStreaks.find(s => s.type === 'task')?.current_streak >= 7 },
    { key: 'journal_streak_7', label: '7-Day Journal Streak', icon: '📝', check: () => allStreaks.find(s => s.type === 'journal')?.current_streak >= 7 },
    { key: 'journal_streak_30', label: '30-Day Journal Streak', icon: '📖', check: () => allStreaks.find(s => s.type === 'journal')?.current_streak >= 30 },
    { key: 'workout_streak_7', label: '7-Day Workout Streak', icon: '💪', check: () => allStreaks.find(s => s.type === 'workout')?.current_streak >= 7 },
    { key: 'focus_centurion', label: '100 Focus Sessions', icon: '🎯', check: () => totalFocusSessions >= 100 },
    { key: 'focus_streak_7', label: '7-Day Focus Streak', icon: '🧠', check: () => allStreaks.find(s => s.type === 'focus')?.current_streak >= 7 },
    { key: 'planner_streak_7', label: '7-Day Planner Streak', icon: '📅', check: () => allStreaks.find(s => s.type === 'planner')?.current_streak >= 7 },
    { key: 'all_rounder', label: 'All Modules in One Day', icon: '🌟', check: () => {
      const today = dateStr(new Date());
      const taskDone = db.prepare("SELECT 1 FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at LIKE ?").get(userId, today + '%');
      const habitDone = db.prepare('SELECT 1 FROM habit_completions WHERE user_id = ? AND completed_date = ?').get(userId, today);
      const journalDone = db.prepare('SELECT 1 FROM journal_entries WHERE user_id = ? AND date = ?').get(userId, today);
      const focusDone = db.prepare('SELECT 1 FROM timer_sessions WHERE user_id = ? AND session_date = ?').get(userId, today);
      const workoutDone = db.prepare('SELECT 1 FROM workouts WHERE user_id = ? AND date = ? AND done = 1').get(userId, today);
      return taskDone && habitDone && journalDone && focusDone && workoutDone;
    }},
  ];

  for (const def of ACHIEVEMENT_DEFS) {
    const exists = db.prepare('SELECT 1 FROM achievements WHERE user_id = ? AND key = ?').get(userId, def.key);
    if (!exists && def.check()) {
      db.prepare('INSERT INTO achievements (id, user_id, key) VALUES (?, ?, ?)').run(genId(), userId, def.key);
      newlyUnlocked.push({ key: def.key, label: def.label, icon: def.icon });
    }
  }

  // Compute XP
  const totalTasksDone = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'done'").get(userId).c;
  const totalHabitCompletions = db.prepare('SELECT COUNT(*) as c FROM habit_completions WHERE user_id = ?').get(userId).c;
  const totalJournalEntries = db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE user_id = ?').get(userId).c;
  const totalWorkoutsDone = db.prepare('SELECT COUNT(*) as c FROM workouts WHERE user_id = ? AND done = 1').get(userId).c;

  const totalXp = (totalTasksDone * 10) + (totalHabitCompletions * 5) + (totalFocusSessions * 15) + (totalJournalEntries * 10) + (totalWorkoutsDone * 10);
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  const existingXp = db.prepare('SELECT 1 FROM user_xp WHERE user_id = ?').get(userId);
  if (existingXp) {
    db.prepare("UPDATE user_xp SET total_xp = ?, level = ?, updated_at = datetime('now') WHERE user_id = ?").run(totalXp, level, userId);
  } else {
    db.prepare('INSERT INTO user_xp (user_id, total_xp, level) VALUES (?, ?, ?)').run(userId, totalXp, level);
  }

  const updatedStreaks = db.prepare('SELECT * FROM streaks WHERE user_id = ?').all(userId);
  const achievements = db.prepare('SELECT * FROM achievements WHERE user_id = ?').all(userId);

  res.json({
    streaks: updatedStreaks,
    achievements,
    xp: { totalXp, level },
    newlyUnlocked,
  });
});

function upsertStreak(userId, type, refId, result) {
  const existing = db.prepare(
    'SELECT * FROM streaks WHERE user_id = ? AND type = ? AND (ref_id = ? OR (ref_id IS NULL AND ? IS NULL))'
  ).get(userId, type, refId, refId);

  if (existing) {
    db.prepare(
      "UPDATE streaks SET current_streak = ?, longest_streak = ?, last_active_date = ?, freeze_days_used = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(result.current, Math.max(result.longest, existing.longest_streak), dateStr(new Date()), result.freezeUsed || 0, existing.id);
  } else {
    db.prepare(
      'INSERT INTO streaks (id, user_id, type, ref_id, current_streak, longest_streak, last_active_date, freeze_days_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(genId(), userId, type, refId, result.current, result.longest, dateStr(new Date()), result.freezeUsed || 0);
  }
}

// POST /api/streaks/freeze
router.post('/freeze', authenticate, (req, res) => {
  const { type, refId } = req.body;
  const streak = db.prepare(
    'SELECT * FROM streaks WHERE user_id = ? AND type = ? AND (ref_id = ? OR (ref_id IS NULL AND ? IS NULL))'
  ).get(req.userId, type, refId || null, refId || null);

  if (!streak) return res.status(404).json({ error: 'Streak not found.' });
  if (streak.freeze_days_used >= streak.freeze_days_allowed) {
    return res.status(400).json({ error: 'No freeze days remaining.' });
  }

  db.prepare("UPDATE streaks SET freeze_days_used = freeze_days_used + 1, updated_at = datetime('now') WHERE id = ?").run(streak.id);
  res.json({ success: true, freezeDaysUsed: streak.freeze_days_used + 1 });
});

// GET /api/achievements
router.get('/achievements', authenticate, (req, res) => {
  const achievements = db.prepare('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC').all(req.userId);
  res.json(achievements);
});

// GET /api/xp
router.get('/xp', authenticate, (req, res) => {
  const xp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(req.userId);
  res.json(xp || { total_xp: 0, level: 1 });
});

module.exports = router;
