const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function computeProductivityScore(date, userId) {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId);
  const totalTasks = tasks.filter(t => t.due_date === date || (t.updated_at && t.updated_at.startsWith(date))).length;
  const doneTasks = tasks.filter(t => t.status === 'done' && t.updated_at && t.updated_at.startsWith(date)).length;

  const habits = db.prepare('SELECT COUNT(*) as total FROM habits WHERE user_id = ?').get(userId).total;
  const habitsDone = db.prepare('SELECT COUNT(*) as done FROM habit_completions WHERE user_id = ? AND completed_date = ?').get(userId, date).done;

  const timer = db.prepare('SELECT * FROM timer_sessions WHERE user_id = ? AND session_date = ?').get(userId, date);
  const focusMinutes = timer ? (timer.count * timer.focus_duration / 60) : 0;

  const workedOut = db.prepare('SELECT COUNT(*) as c FROM workouts WHERE user_id = ? AND date = ? AND done = 1').get(userId, date).c > 0;
  const journaled = db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE user_id = ? AND date = ?').get(userId, date).c > 0;

  const taskScore = totalTasks > 0 ? (doneTasks / totalTasks) * 30 : (doneTasks > 0 ? 30 : 0);
  const habitScore = habits > 0 ? (habitsDone / habits) * 30 : 0;
  const focusScore = Math.min((focusMinutes / 120) * 20, 20);
  const workoutScore = workedOut ? 10 : 0;
  const journalScore = journaled ? 10 : 0;

  return {
    score: Math.round(taskScore + habitScore + focusScore + workoutScore + journalScore),
    breakdown: {
      tasks: { done: doneTasks, total: totalTasks, score: Math.round(taskScore) },
      habits: { done: habitsDone, total: habits, score: Math.round(habitScore) },
      focus: { minutes: Math.round(focusMinutes), sessions: timer ? timer.count : 0, score: Math.round(focusScore) },
      workout: { done: workedOut, score: workoutScore },
      journal: { done: journaled, score: journalScore },
    },
  };
}

// GET /api/insights/daily
router.get('/daily', authenticate, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const result = computeProductivityScore(date, req.userId);

  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ?').all(req.userId, date);
  const sleep = db.prepare('SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?').get(req.userId, date);
  const plan = db.prepare('SELECT * FROM daily_plans WHERE user_id = ? AND date = ?').get(req.userId, date);

  res.json({
    date,
    productivityScore: result.score,
    breakdown: result.breakdown,
    meals: { count: meals.length, calories: meals.reduce((s, m) => s + (m.calories || 0), 0) },
    sleep: sleep ? { duration: sleep.duration_minutes, quality: sleep.quality } : null,
    energyLevel: plan ? plan.energy_level : null,
  });
});

// GET /api/insights/weekly
router.get('/weekly', authenticate, (req, res) => {
  const inputDate = req.query.date || new Date().toISOString().split('T')[0];
  const d = new Date(inputDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  // Current week scores
  const dailyScores = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyScores.push({ date: dateStr, ...computeProductivityScore(dateStr, req.userId) });
  }

  const avgScore = Math.round(dailyScores.reduce((s, d) => s + d.score, 0) / 7);

  // Previous week for comparison
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevScores = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(prevMonday);
    date.setDate(prevMonday.getDate() + i);
    prevScores.push(computeProductivityScore(date.toISOString().split('T')[0], req.userId));
  }
  const prevAvgScore = Math.round(prevScores.reduce((s, d) => s + d.score, 0) / 7);

  res.json({
    period: { start: startDate, end: endDate },
    avgProductivityScore: avgScore,
    prevWeekAvgScore: prevAvgScore,
    delta: avgScore - prevAvgScore,
    dailyScores: dailyScores.map(d => ({ date: d.date, score: d.score })),
  });
});

// GET /api/insights/trends
router.get('/trends', authenticate, (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const trends = [];
  const today = new Date();

  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const result = computeProductivityScore(dateStr, req.userId);

    const journal = db.prepare('SELECT mood FROM journal_entries WHERE user_id = ? AND date = ? LIMIT 1').get(req.userId, dateStr);
    const expenses = db.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date = ?"
    ).get(req.userId, dateStr);

    trends.push({
      date: dateStr,
      productivityScore: result.score,
      habitRate: result.breakdown.habits.total > 0
        ? Math.round((result.breakdown.habits.done / result.breakdown.habits.total) * 100) : 0,
      focusMinutes: result.breakdown.focus.minutes,
      mood: journal ? journal.mood : null,
      expenses: expenses ? expenses.total || 0 : 0,
    });
  }

  res.json({ range, trends });
});

module.exports = router;
