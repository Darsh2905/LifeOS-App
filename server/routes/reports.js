const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getWeeklySummaryData } = require('../services/dataCollector');

const router = express.Router();

function generateHighlights(current, previous) {
  const highlights = [];

  if (previous) {
    if (current.tasks.completed > previous.tasks.completed) {
      const pct = previous.tasks.completed > 0
        ? Math.round(((current.tasks.completed - previous.tasks.completed) / previous.tasks.completed) * 100)
        : 100;
      highlights.push(`Completed ${pct}% more tasks than last week (${current.tasks.completed} vs ${previous.tasks.completed})`);
    }

    if (current.habits.avgCompletionRate > previous.habits.avgCompletionRate) {
      highlights.push(`Habit completion rate improved by ${current.habits.avgCompletionRate - previous.habits.avgCompletionRate}%`);
    }

    if (current.focus.totalMinutes > previous.focus.totalMinutes) {
      highlights.push(`Focus time increased to ${Math.round(current.focus.totalMinutes / 60)} hours (up from ${Math.round(previous.focus.totalMinutes / 60)})`);
    }

    if (current.workouts.daysWorkedOut > previous.workouts.daysWorkedOut) {
      highlights.push(`Worked out ${current.workouts.daysWorkedOut} days (up from ${previous.workouts.daysWorkedOut})`);
    }
  }

  // Budget status
  const totalBudget = current.finance.topCategories.length > 0 ? current.finance.expenses : 0;
  if (current.finance.income > current.finance.expenses) {
    highlights.push(`Positive cash flow: earned ${current.finance.income} and spent ${current.finance.expenses}`);
  }

  if (current.journal.daysJournaled >= 5) {
    highlights.push(`Journaled ${current.journal.daysJournaled} out of 7 days — great consistency!`);
  }

  if (current.habits.avgCompletionRate >= 80) {
    highlights.push(`Strong habit adherence at ${current.habits.avgCompletionRate}% completion rate`);
  }

  return highlights.slice(0, 5);
}

// GET /api/reports/weekly
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

  const current = getWeeklySummaryData(req.userId, startDate, endDate);

  // Previous week
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  const previous = getWeeklySummaryData(req.userId, prevMonday.toISOString().split('T')[0], prevSunday.toISOString().split('T')[0]);

  // Compute deltas
  const deltas = {
    tasksCompleted: current.tasks.completed - previous.tasks.completed,
    habitRate: current.habits.avgCompletionRate - previous.habits.avgCompletionRate,
    focusMinutes: current.focus.totalMinutes - previous.focus.totalMinutes,
    expenses: current.finance.expenses - previous.finance.expenses,
    workoutDays: current.workouts.daysWorkedOut - previous.workouts.daysWorkedOut,
  };

  const highlights = generateHighlights(current, previous);

  res.json({
    ...current,
    previousWeek: {
      tasks: previous.tasks.completed,
      habitRate: previous.habits.avgCompletionRate,
      focusMinutes: previous.focus.totalMinutes,
      expenses: previous.finance.expenses,
      workoutDays: previous.workouts.daysWorkedOut,
    },
    deltas,
    highlights,
  });
});

// GET /api/reports/monthly
router.get('/monthly', authenticate, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const startDate = month + '-01';
  const endDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).toISOString().split('T')[0];

  const data = getWeeklySummaryData(req.userId, startDate, endDate);
  res.json({ month, ...data });
});

module.exports = router;
