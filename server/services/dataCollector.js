const db = require('../db');

function getDailySummaryData(userId, date) {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId);
  const todayTasks = tasks.filter(t => t.due_date === date);
  const doneTodayTasks = tasks.filter(t => t.status === 'done' && t.updated_at && t.updated_at.startsWith(date));

  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  const todayCompletions = db.prepare('SELECT * FROM habit_completions WHERE user_id = ? AND completed_date = ?').all(userId, date);

  const month = date.slice(0, 7);
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ?').all(userId, month);
  const monthExpenses = db.prepare(
    "SELECT category, SUM(amount) as spent FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? GROUP BY category"
  ).all(userId, month + '%');

  const recentJournal = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 3').all(userId);

  const upcomingDeadlines = db.prepare(
    "SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND due_date >= ? AND due_date <= date(?, '+3 days') AND status != 'done' ORDER BY due_date"
  ).all(userId, date, date);

  const timerSession = db.prepare('SELECT * FROM timer_sessions WHERE user_id = ? AND session_date = ?').get(userId, date);

  const workoutsToday = db.prepare('SELECT * FROM workouts WHERE user_id = ? AND date = ?').all(userId, date);
  const mealsToday = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ?').all(userId, date);

  const plan = db.prepare('SELECT * FROM daily_plans WHERE user_id = ? AND date = ?').get(userId, date);

  // Compute habit streaks
  const habitStreaks = habits.map(h => {
    const completions = db.prepare('SELECT completed_date FROM habit_completions WHERE habit_id = ? ORDER BY completed_date DESC').all(h.id);
    let streak = 0;
    const today = new Date(date);
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completions.some(c => c.completed_date === dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return { label: h.label, streak, completedToday: todayCompletions.some(c => c.habit_id === h.id) };
  });

  return {
    date,
    tasks: {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      dueToday: todayTasks.length,
      completedToday: doneTodayTasks.length,
    },
    habits: {
      total: habits.length,
      completedToday: todayCompletions.length,
      streaks: habitStreaks,
    },
    budget: budgets.map(b => {
      const spent = monthExpenses.find(e => e.category === b.category);
      return { category: b.category, limit: b.amount, spent: spent ? spent.spent : 0 };
    }),
    recentMoods: recentJournal.map(j => ({ mood: j.mood, date: j.date })),
    upcomingDeadlines: upcomingDeadlines.map(t => ({ title: t.title, dueDate: t.due_date, priority: t.priority })),
    focusSessions: timerSession ? timerSession.count : 0,
    focusMinutes: timerSession ? Math.round((timerSession.count * timerSession.focus_duration) / 60) : 0,
    workouts: { count: workoutsToday.length, done: workoutsToday.filter(w => w.done).length },
    meals: { count: mealsToday.length, calories: mealsToday.reduce((s, m) => s + (m.calories || 0), 0) },
    energyLevel: plan ? plan.energy_level : null,
  };
}

function getWeeklySummaryData(userId, startDate, endDate) {
  const tasksCreated = db.prepare(
    "SELECT * FROM tasks WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')"
  ).all(userId, startDate, endDate);
  const tasksDone = db.prepare(
    "SELECT * FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= ? AND updated_at < date(?, '+1 day')"
  ).all(userId, startDate, endDate);

  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  const completions = db.prepare(
    'SELECT * FROM habit_completions WHERE user_id = ? AND completed_date >= ? AND completed_date <= ?'
  ).all(userId, startDate, endDate);

  const timerSessions = db.prepare(
    'SELECT * FROM timer_sessions WHERE user_id = ? AND session_date >= ? AND session_date <= ?'
  ).all(userId, startDate, endDate);

  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?'
  ).all(userId, startDate, endDate);
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const journalEntries = db.prepare(
    'SELECT * FROM journal_entries WHERE user_id = ? AND date >= ? AND date <= ?'
  ).all(userId, startDate, endDate);

  const workouts = db.prepare(
    'SELECT * FROM workouts WHERE user_id = ? AND date >= ? AND date <= ?'
  ).all(userId, startDate, endDate);

  const meals = db.prepare(
    'SELECT * FROM meals WHERE user_id = ? AND date >= ? AND date <= ?'
  ).all(userId, startDate, endDate);

  const plans = db.prepare(
    'SELECT * FROM daily_plans WHERE user_id = ? AND date >= ? AND date <= ?'
  ).all(userId, startDate, endDate);

  // Count days in range
  const days = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

  // Per-habit stats
  const perHabit = habits.map(h => {
    const completed = completions.filter(c => c.habit_id === h.id).length;
    return { label: h.label, completed, outOf: days, rate: Math.round((completed / days) * 100) };
  });

  // Mood distribution
  const moodDist = {};
  journalEntries.forEach(j => { moodDist[j.mood] = (moodDist[j.mood] || 0) + 1; });

  // Category breakdown for expenses
  const categoryBreakdown = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryBreakdown[t.category || 'Other'] = (categoryBreakdown[t.category || 'Other'] || 0) + t.amount;
  });

  const totalFocusSessions = timerSessions.reduce((s, t) => s + t.count, 0);
  const totalFocusMinutes = timerSessions.reduce((s, t) => s + (t.count * t.focus_duration / 60), 0);

  const workoutDays = new Set(workouts.filter(w => w.done).map(w => w.date)).size;

  return {
    period: { start: startDate, end: endDate, days },
    tasks: {
      created: tasksCreated.length,
      completed: tasksDone.length,
      completionRate: tasksCreated.length ? Math.round((tasksDone.length / tasksCreated.length) * 100) : 0,
      byPriority: {
        high: tasksDone.filter(t => t.priority === 'high').length,
        medium: tasksDone.filter(t => t.priority === 'medium').length,
        low: tasksDone.filter(t => t.priority === 'low').length,
      },
    },
    habits: {
      totalTracked: habits.length,
      avgCompletionRate: perHabit.length ? Math.round(perHabit.reduce((s, h) => s + h.rate, 0) / perHabit.length) : 0,
      perHabit,
    },
    focus: {
      totalSessions: totalFocusSessions,
      totalMinutes: Math.round(totalFocusMinutes),
      avgPerDay: Math.round(totalFocusMinutes / days),
    },
    finance: {
      income,
      expenses,
      net: income - expenses,
      topCategories: Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount })),
    },
    journal: {
      entriesCount: journalEntries.length,
      daysJournaled: new Set(journalEntries.map(j => j.date)).size,
      moodDistribution: moodDist,
    },
    workouts: {
      daysWorkedOut: workoutDays,
      totalExercises: workouts.length,
      exercisesDone: workouts.filter(w => w.done).length,
    },
    meals: {
      avgDailyCalories: meals.length
        ? Math.round(meals.reduce((s, m) => s + (m.calories || 0), 0) / days)
        : 0,
      daysTracked: new Set(meals.map(m => m.date)).size,
    },
    energy: {
      avgLevel: plans.length
        ? Math.round((plans.reduce((s, p) => s + (p.energy_level || 0), 0) / plans.filter(p => p.energy_level).length) * 10) / 10
        : null,
    },
  };
}

function getFinancialProfile(userId) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split('T')[0];

  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? AND date >= ? ORDER BY date'
  ).all(userId, startDate);

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category || 'Other'] = (categories[t.category || 'Other'] || 0) + t.amount;
  });

  // Day-of-week patterns
  const dowSpending = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const dow = new Date(t.date).getDay();
    dowSpending[dow] += t.amount;
    dowCounts[dow]++;
  });

  // Monthly trends
  const monthlyTrends = {};
  transactions.forEach(t => {
    const m = t.date.slice(0, 7);
    if (!monthlyTrends[m]) monthlyTrends[m] = { income: 0, expenses: 0 };
    if (t.type === 'income') monthlyTrends[m].income += t.amount;
    if (t.type === 'expense') monthlyTrends[m].expenses += t.amount;
  });

  // Current month budget
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ?').all(userId, currentMonth);
  const currentMonthExpenses = db.prepare(
    "SELECT category, SUM(amount) as spent FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ? GROUP BY category"
  ).all(userId, currentMonth + '%');

  const budgetStatus = budgets.map(b => {
    const spent = currentMonthExpenses.find(e => e.category === b.category);
    return { category: b.category, limit: b.amount, spent: spent ? spent.spent : 0 };
  });

  // Savings goals
  const savingsGoals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ?').all(userId);

  // Recurring bills
  const recurring = db.prepare("SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1").all(userId);

  return {
    period: '3 months',
    totalIncome: income,
    totalExpenses: expenses,
    net: income - expenses,
    categoryBreakdown: Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([c, a]) => ({ category: c, amount: a })),
    dayOfWeekAvg: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
      day,
      avgSpend: dowCounts[i] ? Math.round(dowSpending[i] / dowCounts[i]) : 0,
    })),
    monthlyTrends: Object.entries(monthlyTrends).map(([month, d]) => ({ month, ...d })),
    budgetStatus,
    savingsGoals: savingsGoals.map(g => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      progress: Math.round((g.current_amount / g.target_amount) * 100),
      deadline: g.deadline,
    })),
    recurringBills: recurring.map(r => ({ description: r.description, amount: r.amount, frequency: r.frequency, type: r.type })),
  };
}

function getWellnessProfile(userId) {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const startDate = twoWeeksAgo.toISOString().split('T')[0];

  const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? AND date >= ? ORDER BY date DESC').all(userId, startDate);
  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date >= ? ORDER BY date DESC').all(userId, startDate);
  const journal = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? AND date >= ? ORDER BY date DESC').all(userId, startDate);
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  const completions = db.prepare('SELECT * FROM habit_completions WHERE user_id = ? AND completed_date >= ?').all(userId, startDate);
  const sleep = db.prepare('SELECT * FROM sleep_logs WHERE user_id = ? AND date >= ? ORDER BY date DESC').all(userId, startDate);

  return {
    workouts: {
      daysActive: new Set(workouts.filter(w => w.done).map(w => w.date)).size,
      exercises: workouts.map(w => ({ exercise: w.exercise, date: w.date, done: w.done })),
    },
    meals: {
      avgCalories: meals.length ? Math.round(meals.reduce((s, m) => s + (m.calories || 0), 0) / 14) : 0,
    },
    moods: journal.map(j => ({ mood: j.mood, date: j.date })),
    habitRates: habits.map(h => ({
      label: h.label,
      completions: completions.filter(c => c.habit_id === h.id).length,
      outOf: 14,
    })),
    sleep: sleep.map(s => ({ date: s.date, duration: s.duration_minutes, quality: s.quality })),
  };
}

module.exports = { getDailySummaryData, getWeeklySummaryData, getFinancialProfile, getWellnessProfile };
