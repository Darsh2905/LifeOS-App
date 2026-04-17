const db = require('../db');
const { stats } = require('./claude');
const {
  getDailySummaryData,
  getWeeklySummaryData,
  getFinancialProfile,
  getWellnessProfile,
} = require('./dataCollector');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOOD_SCORES = { '😄': 5, '😊': 4, '🙂': 4, '😐': 3, '😔': 2, '😫': 1, '😡': 1 };
const TASK_VERBS = ['plan', 'design', 'draft', 'write', 'build', 'set up', 'review', 'test', 'launch', 'ship', 'submit', 'call', 'email', 'book', 'buy', 'prepare', 'research'];
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from', 'had', 'has', 'have',
  'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our',
  'she', 'so', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'up', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your', 'today', 'yesterday',
  'tomorrow', 'just', 'really', 'very', 'more', 'less', 'over', 'under', 'about', 'after', 'before',
]);

const BOOK_CATALOG = [
  { title: 'Atomic Habits', author: 'James Clear', tags: ['habits', 'productivity', 'behavior'] },
  { title: 'Deep Work', author: 'Cal Newport', tags: ['focus', 'productivity', 'career'] },
  { title: 'The Psychology of Money', author: 'Morgan Housel', tags: ['finance', 'money', 'behavior'] },
  { title: 'Essentialism', author: 'Greg McKeown', tags: ['priorities', 'productivity', 'clarity'] },
  { title: 'Make Time', author: 'Jake Knapp and John Zeratsky', tags: ['focus', 'time', 'habits'] },
  { title: 'Why We Sleep', author: 'Matthew Walker', tags: ['sleep', 'wellness', 'health'] },
  { title: 'Tiny Habits', author: 'BJ Fogg', tags: ['habits', 'behavior', 'self-improvement'] },
  { title: 'The One Thing', author: 'Gary Keller and Jay Papasan', tags: ['priorities', 'focus', 'productivity'] },
  { title: 'Mindset', author: 'Carol S. Dweck', tags: ['growth', 'psychology', 'self-improvement'] },
  { title: 'Digital Minimalism', author: 'Cal Newport', tags: ['focus', 'technology', 'clarity'] },
  { title: 'Ikigai', author: 'Hector Garcia and Francesc Miralles', tags: ['purpose', 'wellness', 'reflection'] },
  { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', tags: ['habits', 'leadership', 'effectiveness'] },
];

const MEAL_LIBRARY = [
  { name: 'Greek yogurt bowl with fruit and seeds', type: '🍳 Breakfast', calories: 320, tags: ['high-protein', 'vegetarian'] },
  { name: 'Masala oats with paneer', type: '🍳 Breakfast', calories: 380, tags: ['savory', 'vegetarian'] },
  { name: 'Egg bhurji with whole grain toast', type: '🍳 Breakfast', calories: 360, tags: ['high-protein'] },
  { name: 'Grilled chicken rice bowl', type: '🥗 Lunch', calories: 520, tags: ['high-protein'] },
  { name: 'Dal, brown rice, and cucumber salad', type: '🥗 Lunch', calories: 480, tags: ['vegetarian', 'balanced'] },
  { name: 'Tofu stir-fry with vegetables', type: '🥗 Lunch', calories: 460, tags: ['vegetarian', 'balanced'] },
  { name: 'Salmon, sweet potato, and greens', type: '🍽️ Dinner', calories: 540, tags: ['balanced'] },
  { name: 'Paneer tikka wrap with salad', type: '🍽️ Dinner', calories: 500, tags: ['vegetarian', 'high-protein'] },
  { name: 'Lentil soup with side salad', type: '🍽️ Dinner', calories: 410, tags: ['vegetarian', 'light'] },
  { name: 'Apple with peanut butter', type: '🍎 Snack', calories: 210, tags: ['snack'] },
  { name: 'Roasted chana and fruit', type: '🍎 Snack', calories: 180, tags: ['snack', 'high-protein'] },
  { name: 'Protein smoothie with banana', type: '🍎 Snack', calories: 260, tags: ['snack', 'high-protein'] },
];

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function addDays(dateStr, delta) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + delta);
  return formatDate(date);
}

function startOfWeek(dateStr) {
  const date = parseDate(dateStr);
  const diff = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - diff);
  return formatDate(date);
}

function endOfWeek(dateStr) {
  return addDays(startOfWeek(dateStr), 6);
}

function startOfMonth(dateStr) {
  const date = parseDate(dateStr);
  date.setDate(1);
  return formatDate(date);
}

function endOfMonth(dateStr) {
  const date = parseDate(dateStr);
  date.setMonth(date.getMonth() + 1, 0);
  return formatDate(date);
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function daysBetween(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / 86400000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function titleCase(value) {
  return (value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function stripHtml(html) {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceSplit(text) {
  return (text || '')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function extractKeywords(text, limit = 6) {
  const counts = new Map();
  tokenize(text).forEach(token => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function extractActionItems(text) {
  const lines = (text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  const actions = [];
  const actionRe = /\b(todo|follow up|call|email|schedule|submit|finish|review|prepare|buy|book|send|plan|draft|fix|update)\b/i;

  lines.forEach(line => {
    const clean = line.replace(/^[-*]\s*/, '').trim();
    if (actionRe.test(clean)) actions.push(clean);
  });

  if (!actions.length) {
    sentenceSplit(text).forEach(sentence => {
      if (actionRe.test(sentence)) actions.push(sentence);
    });
  }

  return [...new Set(actions)].slice(0, 5);
}

function scoreTextSentiment(text) {
  const positive = ['good', 'great', 'progress', 'proud', 'happy', 'calm', 'better', 'excited', 'grateful', 'win', 'finished', 'done'];
  const negative = ['tired', 'stressed', 'overwhelmed', 'anxious', 'sad', 'angry', 'frustrated', 'stuck', 'late', 'behind', 'worried', 'exhausted'];
  const tokens = tokenize(text);
  let score = 0;
  tokens.forEach(token => {
    if (positive.includes(token)) score += 1;
    if (negative.includes(token)) score -= 1;
  });
  return score;
}

function getMoodScore(mood) {
  return MOOD_SCORES[mood] || 3;
}

function humanList(items) {
  const values = items.filter(Boolean);
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenOverlapScore(a, b) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  aTokens.forEach(token => {
    if (bTokens.has(token)) overlap += 1;
  });
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function priorityWeight(priority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function categoryKeywords() {
  return [
    { category: 'Food', words: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'coffee', 'cafe', 'restaurant', 'grocery', 'groceries', 'swiggy', 'zomato'] },
    { category: 'Transport', words: ['uber', 'ola', 'cab', 'taxi', 'metro', 'train', 'bus', 'fuel', 'petrol', 'diesel', 'travel', 'flight'] },
    { category: 'Shopping', words: ['amazon', 'shopping', 'clothes', 'shirt', 'jeans', 'shoes', 'mall'] },
    { category: 'Bills', words: ['bill', 'electricity', 'internet', 'wifi', 'phone', 'recharge', 'rent', 'utility'] },
    { category: 'Health', words: ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'gym'] },
    { category: 'Entertainment', words: ['movie', 'netflix', 'spotify', 'game', 'concert', 'entertainment'] },
    { category: 'Salary', words: ['salary', 'paycheck', 'pay day', 'payday'] },
    { category: 'Freelance', words: ['freelance', 'client', 'invoice', 'project payment'] },
    { category: 'Refund', words: ['refund', 'cashback', 'reimbursement'] },
    { category: 'Transfer', words: ['transfer', 'moved', 'sent to bank'] },
  ];
}

function inferTransactionCategory(text, existingCategories = []) {
  const lower = (text || '').toLowerCase();
  for (const entry of categoryKeywords()) {
    if (entry.words.some(word => lower.includes(word))) {
      const existing = existingCategories.find(category => category.toLowerCase() === entry.category.toLowerCase());
      return existing || entry.category;
    }
  }

  const similarityMatch = existingCategories.find(category => lower.includes(category.toLowerCase()));
  return similarityMatch || 'General';
}

function getTransactionAverages(userId) {
  const recentAmounts = db.prepare(
    "SELECT amount, category, description FROM transactions WHERE user_id = ? AND type = 'expense' ORDER BY date DESC LIMIT 80"
  ).all(userId);

  const avgByCategory = {};
  recentAmounts.forEach(transaction => {
    const category = transaction.category || 'General';
    if (!avgByCategory[category]) avgByCategory[category] = { total: 0, count: 0, descriptions: [] };
    avgByCategory[category].total += transaction.amount || 0;
    avgByCategory[category].count += 1;
    if (transaction.description) avgByCategory[category].descriptions.push(transaction.description.toLowerCase());
  });

  return Object.fromEntries(
    Object.entries(avgByCategory).map(([category, data]) => [category, {
      average: data.count ? data.total / data.count : 0,
      samples: data.count,
      descriptions: data.descriptions.slice(0, 8),
    }])
  );
}

function inferTransactionType(text) {
  const lower = (text || '').toLowerCase();
  if (/\b(salary|refund|reimbursement|freelance|sold|received|credit|cashback|bonus|income)\b/.test(lower)) return 'income';
  if (/\b(transfer|moved to)\b/.test(lower)) return 'transfer';
  return 'expense';
}

function parseShorthandNumber(raw) {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/[, ]/g, '');
  const number = parseFloat(cleaned);
  if (Number.isNaN(number)) return null;
  if (cleaned.endsWith('k')) return number * 1000;
  if (cleaned.endsWith('l') || cleaned.endsWith('lac') || cleaned.endsWith('lakh')) return number * 100000;
  if (cleaned.endsWith('m')) return number * 1000000;
  return number;
}

function parseRelativeDate(text) {
  const today = todayString();
  const lower = (text || '').toLowerCase();
  if (lower.includes('today')) return today;
  if (lower.includes('yesterday')) return addDays(today, -1);
  if (lower.includes('tomorrow')) return addDays(today, 1);

  const dayMatch = lower.match(/\b(last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const target = DAY_NAMES.findIndex(day => day.toLowerCase() === dayMatch[2]);
    const date = parseDate(today);
    let diff = (date.getDay() - target + 7) % 7;
    if (diff === 0 || dayMatch[1]) diff += 7;
    date.setDate(date.getDate() - diff);
    return formatDate(date);
  }

  const explicit = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];
  return today;
}

function relativeDateLabel(dateStr) {
  const delta = daysBetween(todayString(), dateStr);
  if (delta === 0) return 'today';
  if (delta === 1) return 'tomorrow';
  if (delta > 1) return `in ${delta} days`;
  if (delta === -1) return 'yesterday';
  return `${Math.abs(delta)} days ago`;
}

function pickTopItems(items, scoreFn, limit = 3) {
  return [...items].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, limit);
}

function buildInsightTitle(prefix, subject) {
  return `${prefix}: ${subject}`;
}

function herfindahlIndex(values) {
  const total = sum(values);
  if (!total) return 0;
  return round(values.reduce((score, value) => {
    const share = value / total;
    return score + share * share;
  }, 0) * 100, 1);
}

function weeklyBucketsFromTransactions(entries) {
  const buckets = {};
  entries.forEach(entry => {
    const weekStart = startOfWeek(entry.date);
    buckets[weekStart] = (buckets[weekStart] || 0) + (entry.amount || 0);
  });
  return Object.entries(buckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, total]) => ({ week, total }));
}

function chooseConsistentTags(tagPool, keywords) {
  const pool = [...tagPool];
  const picks = [];

  keywords.forEach(keyword => {
    const exact = pool.find(tag => normalizeToken(tag) === normalizeToken(keyword));
    const fuzzy = pool
      .map(tag => ({ tag, score: tokenOverlapScore(tag, keyword) }))
      .sort((a, b) => b.score - a.score)[0];

    const chosen = exact || (fuzzy?.score >= 0.5 ? fuzzy.tag : null) || keyword;
    if (!picks.includes(chosen)) picks.push(chosen);
  });

  return picks.slice(0, 4);
}

function detectDomain(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(spend|spent|budget|income|salary|expense|money)\b/.test(lower)) return 'finance';
  if (/\b(habit|streak)\b/.test(lower)) return 'habits';
  if (/\b(overdue|task|priority|prioritize|focus on today)\b/.test(lower)) return 'tasks';
  if (/\b(workout|exercise|train)\b/.test(lower)) return 'workout';
  if (/\b(week|weekly summary|summarize my week)\b/.test(lower)) return 'weekly';
  if (/\b(mood|sleep|wellness|hydration|water)\b/.test(lower)) return 'wellness';
  if (/\b(goal|milestone)\b/.test(lower)) return 'goals';
  return null;
}

function getCurrentWeekRange() {
  const today = todayString();
  return { start: startOfWeek(today), end: today };
}

function resolveDateRange(query) {
  const today = todayString();
  const lower = (query || '').toLowerCase();

  if (lower.includes('today')) return { startDate: today, endDate: today };
  if (lower.includes('yesterday')) return { startDate: addDays(today, -1), endDate: addDays(today, -1) };
  if (lower.includes('this week')) return { startDate: startOfWeek(today), endDate: today };
  if (lower.includes('last week')) {
    const thisWeekStart = startOfWeek(today);
    const end = addDays(thisWeekStart, -1);
    return { startDate: addDays(thisWeekStart, -7), endDate: end };
  }
  if (lower.includes('this month')) return { startDate: startOfMonth(today), endDate: today };
  if (lower.includes('last month')) {
    const currentStart = parseDate(startOfMonth(today));
    currentStart.setDate(0);
    const end = formatDate(currentStart);
    currentStart.setDate(1);
    return { startDate: formatDate(currentStart), endDate: end };
  }

  const pastMatch = lower.match(/\b(?:past|last)\s+(\d+)\s+days?\b/);
  if (pastMatch) {
    const days = Number(pastMatch[1]);
    return { startDate: addDays(today, -days + 1), endDate: today };
  }

  return { startDate: addDays(today, -29), endDate: today };
}

function summarizeTrendLabel(trend) {
  if (trend === 'improving') return 'upward';
  if (trend === 'declining') return 'downward';
  return 'steady';
}

function extractThemesFromBooks(books) {
  const keywords = new Set();
  books.forEach(book => {
    tokenize(`${book.title} ${book.notes || ''}`).forEach(token => keywords.add(token));
  });
  return [...keywords];
}

function getHabitStatsForRange(userId, days = 30) {
  const startDate = addDays(todayString(), -(days - 1));
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  const completions = db.prepare(
    'SELECT habit_id, completed_date FROM habit_completions WHERE user_id = ? AND completed_date >= ? ORDER BY completed_date'
  ).all(userId, startDate);
  const today = todayString();

  return habits.map(habit => {
    const rows = completions.filter(entry => entry.habit_id === habit.id);
    const dates = rows.map(entry => entry.completed_date);
    const completionRate = Math.round((rows.length / days) * 100);
    const dowPattern = stats.byDayOfWeek(rows, 'completed_date', () => 1);
    const bestDay = [...dowPattern].sort((a, b) => b.count - a.count)[0];
    const worstDay = [...dowPattern].sort((a, b) => a.count - b.count)[0];
    const weeklyBuckets = [0, 0, 0, 0];
    rows.forEach(entry => {
      const age = Math.floor((parseDate(today) - parseDate(entry.completed_date)) / (7 * 86400000));
      if (age >= 0 && age < 4) weeklyBuckets[3 - age] += 1;
    });
    return {
      ...habit,
      currentStreak: stats.streak(dates, parseDate(today)),
      completionRate,
      totalCompletions: rows.length,
      bestDay: bestDay?.day || null,
      worstDay: worstDay?.day || null,
      weeklyTrend: stats.trend(weeklyBuckets),
      completedToday: dates.includes(today),
    };
  });
}

function classifyStatus(completionRate, weeklyTrend) {
  if (completionRate >= 70 && weeklyTrend !== 'declining') return 'thriving';
  if (completionRate < 40 || weeklyTrend === 'declining') return 'struggling';
  return 'building';
}

function buildBriefingPayload(userId, date, weather) {
  const data = getDailySummaryData(userId, date);
  const completionRate = percent(data.tasks.done, data.tasks.total || 1);
  const atRiskStreaks = (data.habits.streaks || []).filter(habit => habit.streak >= 3 && !habit.completedToday);
  const budgetWarnings = (data.budget || []).filter(item => item.limit > 0 && item.spent >= item.limit * 0.85);
  const urgentTasks = (data.upcomingDeadlines || []).filter(task => task.priority === 'high');

  const opener = [];
  opener.push(`Good morning. You have ${data.tasks.dueToday} task${data.tasks.dueToday === 1 ? '' : 's'} due today and ${data.tasks.completedToday} completed so far.`);
  if (data.focusSessions > 0) opener.push(`You have already logged ${data.focusSessions} focus session${data.focusSessions === 1 ? '' : 's'} for ${data.focusMinutes} minute${data.focusMinutes === 1 ? '' : 's'}.`);
  else opener.push(`Your overall task completion sits at ${completionRate}% across the workspace, so today's leverage is in finishing the right things early.`);

  const priorities = [];
  if (urgentTasks.length) {
    priorities.push(`Prioritize ${humanList(urgentTasks.slice(0, 2).map(task => `"${task.title}" ${relativeDateLabel(task.dueDate)}`))}.`);
  } else if (data.tasks.dueToday) {
    priorities.push(`Front-load your due-today work while your energy is highest.`);
  } else {
    priorities.push(`Use the morning for a high-impact task before the day fills up with admin work.`);
  }

  if (atRiskStreaks.length) {
    priorities.push(`Your ${humanList(atRiskStreaks.map(habit => `${habit.label} ${habit.streak}-day streak`))} is at risk if you do not check it off today.`);
  }

  if (budgetWarnings.length) {
    priorities.push(`Watch ${humanList(budgetWarnings.map(item => `${item.category} at ${percent(item.spent, item.limit)}% of budget`))} before adding discretionary spend.`);
  }

  if (weather?.temp !== undefined) {
    const weatherHint = weather.temp >= 30
      ? 'plan outdoor errands early or late'
      : weather.temp <= 15
        ? 'bundle up if you are stepping out'
        : 'it is a solid day for a walk or quick workout';
    priorities.push(`Weather in ${weather.city}: ${weather.temp} degrees and ${weather.description}, so ${weatherHint}.`);
  }

  const closingTarget = urgentTasks[0]?.title
    || data.upcomingDeadlines[0]?.title
    || data.habits.streaks.find(habit => !habit.completedToday)?.label
    || 'one meaningful task';

  const close = `Best next move: block 45 focused minutes for ${closingTarget}.`;
  const briefing = `${opener.join(' ')}\n\n${priorities.join(' ')}\n\n${close}`;
  const signals = [
    { label: 'Due today', value: String(data.tasks.dueToday), tone: data.tasks.dueToday > 0 ? 'amber' : 'emerald' },
    { label: 'At-risk streaks', value: String(atRiskStreaks.length), tone: atRiskStreaks.length > 0 ? 'red' : 'emerald' },
    { label: 'Budget alerts', value: String(budgetWarnings.length), tone: budgetWarnings.length > 0 ? 'amber' : 'emerald' },
    { label: 'Focus mins', value: String(data.focusMinutes || 0), tone: data.focusMinutes > 0 ? 'purple' : 'slate' },
  ];

  return { briefing, signals, data };
}

function buildBriefing(userId, date, weather) {
  return buildBriefingPayload(userId, date, weather).briefing;
}

function parseTransaction(userId, text) {
  const existingCategories = db.prepare(
    'SELECT DISTINCT category FROM transactions WHERE user_id = ? AND category IS NOT NULL AND category != ""'
  ).all(userId).map(row => row.category);
  const avgByCategory = getTransactionAverages(userId);

  const amountMatch = (text || '').match(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d+)?(?:k|l|lac|lakh|m)?)/i);
  const amount = parseShorthandNumber(amountMatch?.[1]);
  const date = parseRelativeDate(text);
  const type = inferTransactionType(text);
  let category = inferTransactionCategory(text, existingCategories);
  if (category === 'General' && amount && Object.keys(avgByCategory).length) {
    const closest = Object.entries(avgByCategory)
      .map(([name, meta]) => ({
        name,
        ratio: meta.average ? Math.abs(meta.average - amount) / Math.max(meta.average, amount, 1) : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.ratio - b.ratio)[0];
    if (closest && closest.ratio <= 0.45) category = closest.name;
  }

  const description = titleCase(
    (text || '')
      .replace(/(?:rs\.?|inr|₹|\$)?\s*\d+(?:\.\d+)?(?:k|l|lac|lakh|m)?/ig, '')
      .replace(/\b(today|yesterday|tomorrow|last\s+\w+)\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim()
  ) || category;

  let confidence = 40;
  if (amount) confidence += 30;
  if (category && category !== 'General') confidence += 15;
  if (date) confidence += 10;
  if (type !== 'expense') confidence += 5;
  const categoryAverage = avgByCategory[category]?.average || null;
  if (amount && categoryAverage) {
    const ratio = amount / Math.max(categoryAverage, 1);
    if (ratio >= 0.4 && ratio <= 2.6) confidence += 10;
  }

  return {
    type: type === 'transfer' ? 'expense' : type,
    amount: amount ? round(amount, 2) : null,
    category,
    description,
    date,
    confidence: clamp(confidence, 0, 100),
    avgCategoryAmount: categoryAverage ? round(categoryAverage, 2) : null,
  };
}

function buildJournalReflection(userId, text, mood) {
  const recentEntries = db.prepare(
    'SELECT text, mood, date FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(userId);
  const wellness = getWellnessProfile(userId);
  const themes = extractKeywords(text, 4);
  const recentMoodScores = recentEntries.map(entry => getMoodScore(entry.mood));
  const moodTrend = stats.trend(recentMoodScores);
  const sentiment = scoreTextSentiment(text);

  const leadingTheme = themes[0] || 'what happened today';
  let reflection = `You wrote with a clear focus on ${leadingTheme}`;
  if (themes[1]) reflection += ` and ${themes[1]}`;
  reflection += '. ';
  reflection += sentiment < -1
    ? 'The entry sounds heavy, so it makes sense that your energy feels stretched.'
    : sentiment > 1
      ? 'There is real forward momentum in the way you described the day.'
      : 'There is a thoughtful, measured tone in how you described the day.';

  let patterns = null;
  if (recentEntries.length >= 3) {
    const repeatedThemes = extractKeywords(recentEntries.map(entry => entry.text).join(' '), 3);
    patterns = repeatedThemes.length
      ? `Across recent entries, ${humanList(repeatedThemes.slice(0, 2))} keeps showing up, and your mood has been ${summarizeTrendLabel(moodTrend)} overall.`
      : `You have enough journal history to compare, and your mood has been ${summarizeTrendLabel(moodTrend)} lately.`;
  }

  const moodTrajectory = moodTrend === 'declining'
    ? 'Your recent mood trend is softer than usual, so keep tomorrow intentionally lighter where you can.'
    : moodTrend === 'improving'
      ? 'Your recent mood trend is improving, which suggests the routines you are keeping are helping.'
      : 'Your recent mood trend is fairly steady, which is useful context for what is and is not changing.';

  const prompt = themes.length
    ? `What would make ${leadingTheme} feel 10% more manageable tomorrow?`
    : 'What is one moment from today that deserves a second look before you move on?';

  const suggestedAction = sentiment < -1
    ? 'Take 10 quiet minutes away from screens and decide on only one concrete next step.'
    : wellness.workouts.daysActive < 2
      ? 'Pair tomorrow with a short walk or workout to reset your energy before the day gets noisy.'
      : 'Write down the smallest next action while the insight from this entry is still fresh.';

  return {
    reflection,
    patterns,
    moodTrajectory,
    prompt,
    suggestedAction,
  };
}

function buildSubtasks(title, context, dueDate, avgCompletionDays) {
  const raw = `${title} ${context || ''}`.toLowerCase();
  const dueInDays = dueDate ? Math.max(1, daysBetween(todayString(), dueDate)) : null;
  const baseline = avgCompletionDays ? clamp(Math.round(avgCompletionDays), 1, 4) : 2;
  const tasks = [];

  const pushTask = (taskTitle, estimatedDays, dependencies = []) => {
    tasks.push({
      title: taskTitle,
      priority: estimatedDays >= 3 ? 'high' : estimatedDays === 2 ? 'medium' : 'low',
      estimatedDays,
      dependencies,
    });
  };

  pushTask('Define the scope and success criteria', 1);

  if (/\b(write|article|report|presentation|proposal|document)\b/.test(raw)) {
    pushTask('Gather the source material and outline the structure', baseline, [0]);
    pushTask('Draft the first complete version', baseline, [1]);
    pushTask('Review, tighten, and finalize the delivery version', 1, [2]);
  } else if (/\b(build|app|feature|website|dashboard|api|system|project|tool)\b/.test(raw)) {
    pushTask('Design the implementation approach and main components', baseline, [0]);
    pushTask('Build the core functionality', baseline + 1, [1]);
    pushTask('Test the main flows and fix edge cases', 1, [2]);
    pushTask('Prepare the final release or handoff', 1, [3]);
  } else if (/\b(plan|event|trip|launch|campaign)\b/.test(raw)) {
    pushTask('Break the work into milestones and owners', 1, [0]);
    pushTask('Secure the key resources and dependencies', baseline, [1]);
    pushTask('Execute the core deliverables', baseline + 1, [2]);
    pushTask('Review readiness and close any gaps', 1, [3]);
  } else {
    pushTask('Break the work into a first actionable milestone', 1, [0]);
    pushTask('Complete the core execution block', baseline + 1, [1]);
    pushTask('Review outcomes and finalize the task', 1, [2]);
  }

  const totalDays = sum(tasks.map(task => task.estimatedDays));
  const compression = dueInDays && totalDays > dueInDays ? dueInDays / totalDays : 1;
  const normalized = tasks.map(task => ({
    ...task,
    estimatedDays: clamp(Math.max(1, Math.round(task.estimatedDays * compression)), 1, 7),
  }));
  return normalized.slice(0, 7);
}

function breakTaskPlan(userId, title, dueDate, context) {
  const completedTasks = db.prepare(
    "SELECT created_at, updated_at FROM tasks WHERE user_id = ? AND status = 'done' ORDER BY updated_at DESC LIMIT 30"
  ).all(userId);

  const avgCompletionDays = completedTasks.length
    ? round(average(completedTasks.map(task => Math.max(1, round((new Date(task.updated_at) - new Date(task.created_at)) / 86400000, 1)))), 1)
    : null;

  const subtasks = buildSubtasks(title, context, dueDate, avgCompletionDays);
  const complexityScore = clamp(Math.round(subtasks.length + (context ? 1 : 0) + (dueDate ? 1 : 0) + Math.min(title.split(/\s+/).length / 4, 3)), 1, 10);
  const suggestedApproach = dueDate
    ? 'Front-load the discovery and core build work, then leave explicit buffer for review before the deadline.'
    : 'Treat the first subtask as a proof point, then build momentum by finishing one concrete block at a time.';

  if (dueDate) {
    const deadline = parseDate(dueDate);
    const totalDays = sum(subtasks.map(task => task.estimatedDays));
    let offset = 0;
    subtasks.forEach(task => {
      offset += task.estimatedDays;
      const suggestedDate = new Date(deadline);
      suggestedDate.setDate(suggestedDate.getDate() - (totalDays - offset));
      task.suggestedDueDate = formatDate(suggestedDate);
    });
  }

  return { subtasks, complexityScore, suggestedApproach };
}

function buildFinancialAdvice(userId) {
  const profile = getFinancialProfile(userId);
  const monthlyExpenses = (profile.monthlyTrends || []).map(entry => entry.expenses);
  const monthlyIncome = (profile.monthlyTrends || []).map(entry => entry.income);
  const spendingTrend = stats.trend(monthlyExpenses);
  const savingsRate = profile.totalIncome > 0 ? percent(profile.totalIncome - profile.totalExpenses, profile.totalIncome) : 0;
  const topCategory = profile.categoryBreakdown?.[0];
  const overBudget = (profile.budgetStatus || []).filter(entry => entry.limit > 0 && entry.spent > entry.limit);
  const nearBudget = (profile.budgetStatus || []).filter(entry => entry.limit > 0 && entry.spent >= entry.limit * 0.85 && entry.spent <= entry.limit);
  const burnRate = round(average(monthlyExpenses), 0);
  const avgIncome = round(average(monthlyIncome), 0);
  const concentrationIndex = herfindahlIndex((profile.categoryBreakdown || []).map(entry => entry.amount));
  const monthlyNet = avgIncome - burnRate;
  const goalsWithProjection = (profile.savingsGoals || []).map(goal => ({
    ...goal,
    monthsToGoal: monthlyNet > 0 ? Math.ceil(Math.max(goal.target - goal.current, 0) / monthlyNet) : null,
  }));
  const insights = [];

  insights.push({
    title: buildInsightTitle('Savings rate', `${savingsRate}%`),
    detail: savingsRate >= 20
      ? `You are retaining ${savingsRate}% of income across the last three months, which is ahead of the common 20% benchmark.`
      : `You are retaining ${savingsRate}% of income across the last three months, so tightening one or two categories would improve resilience.`,
    type: savingsRate >= 20 ? 'positive' : 'warning',
    impact: savingsRate >= 20 ? 'medium' : 'high',
  });

  if (topCategory) {
    insights.push({
      title: buildInsightTitle('Largest expense category', topCategory.category),
      detail: `${topCategory.category} accounts for ${percent(topCategory.amount, profile.totalExpenses || 1)}% of total expenses (${round(topCategory.amount)} over the last three months).`,
      type: percent(topCategory.amount, profile.totalExpenses || 1) > 40 ? 'warning' : 'suggestion',
      impact: percent(topCategory.amount, profile.totalExpenses || 1) > 40 ? 'high' : 'medium',
    });
  }

  insights.push({
    title: buildInsightTitle('Monthly burn rate', `${burnRate}`),
    detail: `Average monthly expenses are ${burnRate}, against average monthly income of ${avgIncome}. Your current monthly net is ${round(monthlyNet)}.`,
    type: monthlyNet >= 0 ? 'positive' : 'warning',
    impact: monthlyNet >= 0 ? 'medium' : 'high',
  });

  insights.push({
    title: buildInsightTitle('Spending concentration', `${concentrationIndex}/100`),
    detail: concentrationIndex >= 35
      ? `Your spending is concentrated in a few categories (Herfindahl ${concentrationIndex}), which makes budget drift harder to absorb.`
      : `Your category spread is fairly balanced (Herfindahl ${concentrationIndex}), which reduces single-category risk.`,
    type: concentrationIndex >= 35 ? 'warning' : 'positive',
    impact: concentrationIndex >= 35 ? 'medium' : 'low',
  });

  if (overBudget.length) {
    insights.push({
      title: buildInsightTitle('Budget overrun', humanList(overBudget.map(item => item.category))),
      detail: `You are already over budget in ${humanList(overBudget.map(item => `${item.category} (${percent(item.spent, item.limit)}%)`))}.`,
      type: 'warning',
      impact: 'high',
    });
  } else if (nearBudget.length) {
    insights.push({
      title: 'Budget watchlist',
      detail: `${humanList(nearBudget.map(item => `${item.category} is at ${percent(item.spent, item.limit)}%`))} needs a lighter rest-of-month pace.`,
      type: 'suggestion',
      impact: 'medium',
    });
  }

  if (goalsWithProjection.length) {
    const nextGoal = [...goalsWithProjection]
      .map(goal => ({
        ...goal,
        remaining: Math.max(0, goal.target - goal.current),
      }))
      .sort((a, b) => a.remaining - b.remaining)[0];

    insights.push({
      title: buildInsightTitle('Closest goal', nextGoal.name),
      detail: `You are ${round(nextGoal.current)} out of ${round(nextGoal.target)} toward ${nextGoal.name}, leaving ${round(nextGoal.remaining)} to close${nextGoal.monthsToGoal ? `, or about ${nextGoal.monthsToGoal} month${nextGoal.monthsToGoal === 1 ? '' : 's'} at the current pace` : ''}.`,
      type: 'positive',
      impact: 'medium',
    });
  }

  const healthScore = clamp(
    50
    + Math.min(25, savingsRate)
    + (spendingTrend === 'declining' ? 10 : spendingTrend === 'stable' ? 4 : -8)
    - overBudget.length * 10
    - (topCategory && percent(topCategory.amount, profile.totalExpenses || 1) > 45 ? 8 : 0)
    - (concentrationIndex >= 35 ? 6 : 0)
    - (monthlyNet < 0 ? 12 : 0),
    0,
    100
  );

  const summary = healthScore >= 75
    ? 'Your finances are stable with a healthy savings profile. The next upgrade is making large categories a bit more intentional.'
    : healthScore >= 55
      ? 'Your finances are workable, but a few categories are carrying too much weight. Tightening those will improve consistency quickly.'
      : 'Your current money flow needs attention. Focus first on budget control and restoring positive monthly slack.';

  return {
    insights,
    healthScore,
    summary,
    metrics: {
      savingsRate,
      burnRate,
      spendingTrend,
      concentrationIndex,
      monthlyNet: round(monthlyNet),
      goalsWithProjection,
    },
  };
}

function getExerciseGroup(exercise) {
  const lower = (exercise || '').toLowerCase();
  if (/(squat|lunge|deadlift|leg|calf)/.test(lower)) return 'legs';
  if (/(bench|push|chest|shoulder|press|tricep)/.test(lower)) return 'push';
  if (/(row|pull|lat|bicep|chin-up|pull-up)/.test(lower)) return 'pull';
  if (/(plank|core|abs|crunch)/.test(lower)) return 'core';
  if (/(run|cycle|walk|cardio)/.test(lower)) return 'cardio';
  return 'full-body';
}

function buildWorkoutSuggestion(userId) {
  const twoWeeksAgo = addDays(todayString(), -14);
  const workouts = db.prepare(
    'SELECT exercise, sets, reps, weight, date, done FROM workouts WHERE user_id = ? AND date >= ? ORDER BY date DESC'
  ).all(userId, twoWeeksAgo);

  const completed = workouts.filter(row => row.done);
  const byGroup = new Map();
  const exerciseHistory = new Map();
  completed.forEach(entry => {
    const group = getExerciseGroup(entry.exercise);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(entry);
    const key = entry.exercise.toLowerCase();
    if (!exerciseHistory.has(key)) exerciseHistory.set(key, []);
    exerciseHistory.get(key).push(entry);
  });

  const groupPriority = ['legs', 'push', 'pull', 'core', 'cardio'];
  const sortedGroups = groupPriority
    .map(group => ({
      group,
      lastDate: byGroup.get(group)?.[0]?.date || '1970-01-01',
      count: byGroup.get(group)?.length || 0,
      daysSince: byGroup.get(group)?.[0]?.date ? Math.max(0, daysBetween(byGroup.get(group)[0].date, todayString())) : 999,
    }))
    .sort((a, b) => a.lastDate.localeCompare(b.lastDate));

  const targetGroup = sortedGroups[0]?.group || 'full-body';
  const targetGroupHistory = (byGroup.get(targetGroup) || []);
  const templates = {
    legs: ['Back Squat', 'Romanian Deadlift', 'Walking Lunge', 'Leg Press', 'Calf Raise'],
    push: ['Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown'],
    pull: ['Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Hammer Curl'],
    core: ['Dead Bug', 'Cable Crunch', 'Plank', 'Pallof Press', 'Hanging Knee Raise'],
    cardio: ['Zone 2 treadmill walk', 'Bike intervals', 'Rowing machine', 'Farmer Carry', 'Mobility circuit'],
    'full-body': ['Goblet Squat', 'Push-Up', 'Dumbbell Row', 'Romanian Deadlift', 'Plank'],
  };

  const candidateNames = [...new Set(
    targetGroupHistory.length
      ? targetGroupHistory.map(entry => entry.exercise).slice(0, 5)
      : (templates[targetGroup] || templates['full-body'])
  )];

  const exercises = candidateNames.map(name => {
    const history = exerciseHistory.get(name.toLowerCase()) || [];
    const latest = history[0];
    const previous = history[1];
    const weight = latest?.weight ? round(latest.weight + (latest.weight >= 20 ? 2.5 : 1), 1) : null;
    const reps = latest?.reps ? clamp(latest.reps + (latest?.weight ? 0 : 1), 6, 15) : targetGroup === 'cardio' ? 1 : 8;
    const daysSince = latest?.date ? Math.max(0, daysBetween(latest.date, todayString())) : null;
    const volumeDelta = latest && previous
      ? ((latest.sets || 0) * (latest.reps || 0) * (latest.weight || 1)) - ((previous.sets || 0) * (previous.reps || 0) * (previous.weight || 1))
      : null;
    return {
      exercise: name,
      sets: latest?.sets || (targetGroup === 'cardio' ? 3 : 3),
      reps,
      weight,
      notes: latest
        ? `${daysSince} day${daysSince === 1 ? '' : 's'} since last session${volumeDelta !== null ? `; previous volume trend was ${volumeDelta >= 0 ? 'up' : 'down'}` : ''}. ${latest.weight ? `Increase from ${latest.weight} if form stayed clean.` : 'Add 1-2 reps if the last set felt strong.'}`
        : 'Use a smooth, controlled first working set and build from there.',
    };
  });

  const reasonMap = {
    legs: 'Your lower-body work has had the longest recovery gap, so today is a good slot for a leg-focused session.',
    push: 'Push work is the most under-served recent pattern, so this session rebalances chest, shoulders, and triceps.',
    pull: 'Your pulling volume looks due for another session, which should also help shoulder balance.',
    core: 'A lower-stress core session fits best with your recent training history.',
    cardio: 'Recent lifting volume is higher than cardio volume, so a conditioning day improves balance.',
    'full-body': 'There is not enough specific history yet, so a balanced full-body session is the safest next step.',
  };

  return {
    exercises,
    warmup: targetGroup === 'legs' ? '5 minutes brisk walking, hip openers, and 2 light squat warmup sets.' : '5 minutes easy cardio, shoulder mobility, and one light ramp-up set for the first lift.',
    cooldown: '3 to 5 minutes of easy walking plus light stretching for the muscles you trained.',
    reasoning: `${reasonMap[targetGroup] || reasonMap['full-body']} ${sortedGroups[0]?.daysSince < 999 ? `It has been about ${sortedGroups[0].daysSince} day${sortedGroups[0].daysSince === 1 ? '' : 's'} since that muscle group was last trained.` : ''}`.trim(),
    recovery: sortedGroups.map(group => ({ group: group.group, daysSince: group.daysSince })),
  };
}

function buildMealSuggestion(userId, calorieTarget, preferences) {
  const weekAgo = addDays(todayString(), -7);
  const recentMeals = db.prepare(
    'SELECT name, type, calories, date FROM meals WHERE user_id = ? AND date >= ? ORDER BY date DESC'
  ).all(userId, weekAgo);
  const target = Number(calorieTarget)
    || Number(db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'calorie_target'").get(userId)?.value)
    || 2000;

  const today = todayString();
  const todayMeals = recentMeals.filter(meal => meal.date === today);
  const caloriesConsumed = sum(todayMeals.map(meal => meal.calories || 0));
  const remaining = Math.max(0, target - caloriesConsumed);
  const eatenTypes = new Set(todayMeals.map(meal => meal.type));
  const remainingTypes = ['🍳 Breakfast', '🥗 Lunch', '🍽️ Dinner', '🍎 Snack'].filter(type => !eatenTypes.has(type));
  const preferenceTokens = tokenize(preferences || '');
  const usedNames = new Set(recentMeals.slice(0, 7).map(meal => meal.name.toLowerCase()));
  const dailyCalories = {};
  recentMeals.forEach(meal => {
    dailyCalories[meal.date] = (dailyCalories[meal.date] || 0) + (meal.calories || 0);
  });
  const avgDailyCalories = round(average(Object.values(dailyCalories)), 0);
  const varietyScore = recentMeals.length ? Math.round((new Set(recentMeals.map(meal => meal.name.toLowerCase())).size / recentMeals.length) * 100) : 0;

  const meals = [];
  remainingTypes.forEach(type => {
    const candidates = MEAL_LIBRARY
      .filter(meal => meal.type === type)
      .filter(meal => !usedNames.has(meal.name.toLowerCase()) || usedNames.size > 4)
      .sort((a, b) => {
        const aScore = preferenceTokens.filter(token => mealMatchesPreference(a, token)).length;
        const bScore = preferenceTokens.filter(token => mealMatchesPreference(b, token)).length;
        const aNovelty = usedNames.has(a.name.toLowerCase()) ? 0 : 1;
        const bNovelty = usedNames.has(b.name.toLowerCase()) ? 0 : 1;
        return bScore - aScore || bNovelty - aNovelty || a.calories - b.calories;
      });
    const pick = candidates.find(candidate => candidate.calories <= Math.max(remaining - sum(meals.map(meal => meal.estimatedCalories)), 150)) || candidates[0];
    if (pick) {
      meals.push({
        name: pick.name,
        type: pick.type,
        estimatedCalories: pick.calories,
      });
    }
  });

  if (!meals.length && remaining >= 150) {
    const snack = MEAL_LIBRARY.find(meal => meal.type === '🍎 Snack');
    if (snack) {
      meals.push({
        name: snack.name,
        type: snack.type,
        estimatedCalories: Math.min(snack.calories, remaining),
      });
    }
  }

  const totalCalories = sum(meals.map(meal => meal.estimatedCalories));
  const notes = remaining <= 250
    ? 'You are close to your calorie target, so keep the rest of the day light and protein-forward.'
    : `These suggestions leave you near your ${target} calorie target while keeping protein spread through the day${varietyScore < 45 ? ' and intentionally increasing variety' : ''}.`;

  return {
    meals,
    totalCalories,
    notes,
    remainingCalories: remaining,
    remainingSlots: remainingTypes.length,
    varietyScore,
    avgDailyCalories,
  };
}

function mealMatchesPreference(meal, token) {
  return meal.name.toLowerCase().includes(token) || meal.tags.some(tag => tag.includes(token));
}

function getHabitsWithStreaks(userId) {
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
  return habits.map(habit => {
    const completions = db.prepare(
      'SELECT completed_date FROM habit_completions WHERE habit_id = ? ORDER BY completed_date DESC'
    ).all(habit.id).map(row => row.completed_date);
    return {
      habit: habit.label,
      streak: stats.streak(completions, parseDate(todayString())),
    };
  });
}

const QUERY_FUNCTIONS = {
  spending_by_category(userId, params) {
    return db.prepare(
      "SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC"
    ).all(userId, params.startDate, params.endDate);
  },
  spending_total(userId, params) {
    return db.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?"
    ).get(userId, params.startDate, params.endDate);
  },
  income_total(userId, params) {
    return db.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?"
    ).get(userId, params.startDate, params.endDate);
  },
  tasks_completed(userId, params) {
    return db.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= ? AND updated_at <= ?"
    ).get(userId, params.startDate, `${params.endDate}T23:59:59`);
  },
  habit_streaks(userId) {
    return getHabitsWithStreaks(userId);
  },
  mood_trend(userId, params) {
    return db.prepare(
      'SELECT mood, date FROM journal_entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date'
    ).all(userId, params.startDate, params.endDate);
  },
  productive_days(userId, params) {
    return db.prepare(
      "SELECT date(updated_at) as day, COUNT(*) as completed FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= ? AND updated_at <= ? GROUP BY day ORDER BY completed DESC"
    ).all(userId, params.startDate, `${params.endDate}T23:59:59`);
  },
  focus_sessions(userId, params) {
    return db.prepare(
      'SELECT session_date, count, focus_duration FROM timer_sessions WHERE user_id = ? AND session_date >= ? AND session_date <= ? ORDER BY session_date'
    ).all(userId, params.startDate, params.endDate);
  },
  sleep_data(userId, params) {
    return db.prepare(
      'SELECT date, duration_minutes, quality FROM sleep_logs WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date'
    ).all(userId, params.startDate, params.endDate);
  },
  water_intake(userId, params) {
    return db.prepare(
      'SELECT date, SUM(amount_ml) as total_ml FROM water_logs WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date'
    ).all(userId, params.startDate, params.endDate);
  },
};

function detectQueryFunctions(query) {
  const lower = (query || '').toLowerCase();
  const params = resolveDateRange(lower);
  const functions = [];

  if (/\b(spend|spent|expense|expenses|budget|category)\b/.test(lower)) {
    functions.push({
      name: /\b(category|categories|where)\b/.test(lower) ? 'spending_by_category' : 'spending_total',
      params,
    });
  }
  if (/\b(income|earned|salary|made)\b/.test(lower)) functions.push({ name: 'income_total', params });
  if (/\b(task|tasks|complete|completed|finish|finished|productivity)\b/.test(lower)) {
    functions.push({ name: /\b(productive|best day)\b/.test(lower) ? 'productive_days' : 'tasks_completed', params });
  }
  if (/\b(habit|streak)\b/.test(lower)) functions.push({ name: 'habit_streaks', params });
  if (/\b(mood|journal|emotion)\b/.test(lower)) functions.push({ name: 'mood_trend', params });
  if (/\b(focus|pomodoro|timer)\b/.test(lower)) functions.push({ name: 'focus_sessions', params });
  if (/\b(sleep|rest)\b/.test(lower)) functions.push({ name: 'sleep_data', params });
  if (/\b(water|hydration)\b/.test(lower)) functions.push({ name: 'water_intake', params });

  if (!functions.length) {
    functions.push({ name: 'spending_total', params });
    functions.push({ name: 'tasks_completed', params });
  }

  const unique = [];
  const seen = new Set();
  functions.forEach(fn => {
    const key = `${fn.name}:${fn.params.startDate}:${fn.params.endDate}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(fn);
    }
  });
  return unique;
}

function formatQueryAnswer(query, results, range) {
  const lower = (query || '').toLowerCase();
  if (results.spending_by_category?.length) {
    const top = results.spending_by_category[0];
    const total = sum(results.spending_by_category.map(item => item.total || 0));
    return `From ${range.startDate} to ${range.endDate}, you spent ${round(total)} in total. ${top.category || 'Uncategorized'} was highest at ${round(top.total)}, which is ${percent(top.total, total || 1)}% of spend.`;
  }
  if (results.spending_total && /\b(spend|spent|expense|budget)\b/.test(lower)) {
    return `From ${range.startDate} to ${range.endDate}, your tracked expenses total ${round(results.spending_total.total || 0)}.`;
  }
  if (results.income_total && /\b(income|earned|salary|made)\b/.test(lower)) {
    return `From ${range.startDate} to ${range.endDate}, your tracked income totals ${round(results.income_total.total || 0)}.`;
  }
  if (results.habit_streaks?.length) {
    const longest = [...results.habit_streaks].sort((a, b) => b.streak - a.streak)[0];
    return `Your longest current streak is ${longest.streak} days for ${longest.habit}.`;
  }
  if (results.tasks_completed && /\b(task|complete|completed|finish|finished)\b/.test(lower)) {
    return `You completed ${results.tasks_completed.count || 0} task${results.tasks_completed.count === 1 ? '' : 's'} from ${range.startDate} to ${range.endDate}.`;
  }
  if (results.productive_days?.length) {
    const top = results.productive_days[0];
    return `Your most productive tracked day in that range was ${top.day}, with ${top.completed} completed tasks.`;
  }
  if (results.focus_sessions?.length) {
    const sessions = sum(results.focus_sessions.map(item => item.count || 0));
    const minutes = Math.round(sum(results.focus_sessions.map(item => ((item.count || 0) * (item.focus_duration || 0)) / 60)));
    return `You logged ${sessions} focus session${sessions === 1 ? '' : 's'} for about ${minutes} focused minutes in that range.`;
  }
  if (results.mood_trend?.length) {
    const scores = results.mood_trend.map(entry => getMoodScore(entry.mood));
    const trend = stats.trend(scores);
    return `Your mood entries show a ${summarizeTrendLabel(trend)} pattern from ${range.startDate} to ${range.endDate}.`;
  }
  if (results.sleep_data?.length) {
    const hours = average(results.sleep_data.map(item => (item.duration_minutes || 0) / 60));
    return `Your average tracked sleep was ${round(hours, 1)} hours from ${range.startDate} to ${range.endDate}.`;
  }
  if (results.water_intake?.length) {
    const avg = average(results.water_intake.map(item => item.total_ml || 0));
    return `Your average tracked hydration was ${Math.round(avg)} ml per day in that range.`;
  }
  return `I could not find a strong data match for that phrasing, but I can answer questions about tasks, habits, spending, focus, sleep, and mood.`;
}

function runDataQuery(userId, query) {
  const functions = detectQueryFunctions(query);
  const results = {};

  functions.forEach(fn => {
    if (QUERY_FUNCTIONS[fn.name]) {
      results[fn.name] = QUERY_FUNCTIONS[fn.name](userId, fn.params || {});
    }
  });

  const range = functions[0]?.params || { startDate: todayString(), endDate: todayString() };
  const answer = formatQueryAnswer(query, results, range);
  return { answer, data: results };
}

function buildWeeklyReview(userId, start, end) {
  const data = getWeeklySummaryData(userId, start, end);
  const prevStart = addDays(start, -7);
  const prevEnd = addDays(start, -1);
  let prevData = null;
  try {
    prevData = getWeeklySummaryData(userId, prevStart, prevEnd);
  } catch {
    prevData = null;
  }

  const wins = [];
  if (data.tasks.completed) wins.push(`you completed ${data.tasks.completed} tasks`);
  if (data.habits.avgCompletionRate) wins.push(`habit consistency reached ${data.habits.avgCompletionRate}%`);
  if (data.focus.totalMinutes) wins.push(`you logged ${data.focus.totalMinutes} focused minutes`);

  const growth = [];
  if (data.finance.expenses > data.finance.income && data.finance.income > 0) growth.push('expenses ran ahead of income, so next week needs a tighter spending ceiling');
  if (data.journal.entriesCount < 2) growth.push('reflection was light, so a midweek journal check-in would give you better signal');
  if (data.workouts.daysWorkedOut < 2) growth.push('movement was inconsistent, so scheduling two fixed workout slots would help');
  if (!growth.length) growth.push('the main opportunity is protecting your best routines on your busiest days');

  const comparison = prevData
    ? `Compared with the previous week, tasks changed by ${data.tasks.completed - prevData.tasks.completed}, focus by ${data.focus.totalMinutes - prevData.focus.totalMinutes} minutes, and expenses by ${round(data.finance.expenses - prevData.finance.expenses)}.`
    : `This is your baseline week, so the value is in noticing which routines created momentum.`;

  const actions = [];
  if (data.tasks.completed < data.tasks.created) actions.push('close the loop on older pending tasks before adding new ones');
  if (data.habits.avgCompletionRate < 70) actions.push('anchor one habit to a fixed time instead of relying on memory');
  if (data.focus.totalMinutes < 180) actions.push('protect one 45-minute distraction-free block on three separate days');
  if (!actions.length) actions.push('repeat the routines that supported your strongest days');

  return `This week, ${wins.length ? humanList(wins.slice(0, 3)) : 'you kept the system moving'}.\n\nThe strongest signal is that you respond well when effort is focused instead of scattered. At the same time, ${growth.slice(0, 2).join(' and ')}. ${comparison}\n\nFor next week, ${actions.slice(0, 3).join(', ')}, and keep your first work block reserved for the task with the highest payoff.`;
}

function buildCorrelationInsights(correlations, threshold = 0.15) {
  return Object.entries(correlations)
    .filter(([, value]) => Math.abs(value.r) >= threshold)
    .sort((a, b) => Math.abs(b[1].r) - Math.abs(a[1].r))
    .slice(0, 4);
}

function buildMoodInsights(userId) {
  const startDate = addDays(todayString(), -29);
  const journal = db.prepare(
    'SELECT mood, date FROM journal_entries WHERE user_id = ? AND date >= ? ORDER BY date'
  ).all(userId, startDate);
  const tasks = db.prepare(
    "SELECT date(updated_at) as day, COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= ? GROUP BY day"
  ).all(userId, startDate);
  const workouts = db.prepare(
    'SELECT date, COUNT(*) as count FROM workouts WHERE user_id = ? AND done = 1 AND date >= ? GROUP BY date'
  ).all(userId, startDate);
  const focus = db.prepare(
    'SELECT session_date as date, count FROM timer_sessions WHERE user_id = ? AND session_date >= ?'
  ).all(userId, startDate);
  const sleep = db.prepare(
    'SELECT date, duration_minutes, quality FROM sleep_logs WHERE user_id = ? AND date >= ?'
  ).all(userId, startDate);
  const water = db.prepare(
    'SELECT date, SUM(amount_ml) as totalMl FROM water_logs WHERE user_id = ? AND date >= ? GROUP BY date'
  ).all(userId, startDate);

  const allDates = [];
  for (let cursor = parseDate(startDate); cursor <= parseDate(todayString()); cursor.setDate(cursor.getDate() + 1)) {
    allDates.push(formatDate(cursor));
  }

  const series = {
    mood: allDates.map(date => {
      const entry = journal.find(row => row.date === date);
      return entry ? getMoodScore(entry.mood) : null;
    }),
    tasks: allDates.map(date => tasks.find(row => row.day === date)?.count || 0),
    exercise: allDates.map(date => workouts.some(row => row.date === date) ? 1 : 0),
    focus: allDates.map(date => focus.find(row => row.date === date)?.count || 0),
    sleep: allDates.map(date => sleep.find(row => row.date === date)?.duration_minutes || null),
    sleepQuality: allDates.map(date => sleep.find(row => row.date === date)?.quality || null),
    water: allDates.map(date => water.find(row => row.date === date)?.totalMl || null),
  };

  const correlationMap = {};
  [
    ['sleep', 'mood', 'Sleep duration and mood'],
    ['sleepQuality', 'mood', 'Sleep quality and mood'],
    ['exercise', 'mood', 'Exercise and mood'],
    ['exercise', 'tasks', 'Exercise and productivity'],
    ['focus', 'tasks', 'Focus sessions and completed tasks'],
    ['sleep', 'tasks', 'Sleep duration and completed tasks'],
    ['water', 'focus', 'Hydration and focus sessions'],
    ['water', 'mood', 'Hydration and mood'],
    ['sleepQuality', 'tasks', 'Sleep quality and productivity'],
    ['focus', 'mood', 'Focus sessions and mood'],
  ].forEach(([xKey, yKey, label]) => {
    const validPairs = series[xKey]
      .map((x, index) => [x, series[yKey][index]])
      .filter(([x, y]) => x !== null && y !== null);

    if (validPairs.length >= 7) {
      const r = stats.correlation(validPairs.map(pair => pair[0]), validPairs.map(pair => pair[1]));
      if (r !== null) {
        correlationMap[label] = {
          r,
          strength: Math.abs(r) > 0.6 ? 'strong' : Math.abs(r) > 0.3 ? 'moderate' : 'weak',
          direction: r >= 0 ? 'positive' : 'negative',
          dataPoints: validPairs.length,
        };
      }
    }
  });

  const insights = buildCorrelationInsights(correlationMap, 0.1).map(([title, value]) => ({
    title,
    detail: `${value.direction === 'positive' ? 'Higher' : 'Lower'} values tend to move with the outcome here (r=${value.r}). Based on ${value.dataPoints} data points, this is a ${value.strength} signal.`,
    confidence: value.dataPoints >= 14 ? 'high' : value.dataPoints >= 10 ? 'medium' : 'low',
  }));

  const avgMood = average(journal.map(entry => getMoodScore(entry.mood)));
  const moodText = journal.length
    ? `Average logged mood is ${round(avgMood, 1)} out of 5 across ${journal.length} journal entries.`
    : 'You need more journal entries before mood patterns become reliable.';

  return {
    insights,
    overallTrend: `${moodText} The clearest patterns are strongest when sleep, movement, or focus habits are tracked consistently.`,
    rawCorrelations: correlationMap,
    dataPoints: {
      journalDays: journal.length,
      trackedDays: allDates.length,
      sleepDays: sleep.length,
      workoutDays: workouts.length,
      waterDays: water.length,
    },
  };
}

function buildSmartSchedule(userId, targetDate, energyLevel) {
  const pendingTasks = db.prepare(
    "SELECT id, title, priority, due_date, category, created_at FROM tasks WHERE user_id = ? AND status != 'done' ORDER BY created_at"
  ).all(userId);
  const habits = db.prepare('SELECT label FROM habits WHERE user_id = ?').all(userId).map(row => row.label);
  const recentWorkouts = db.prepare(
    'SELECT date FROM workouts WHERE user_id = ? AND done = 1 ORDER BY date DESC LIMIT 7'
  ).all(userId);

  const scoredTasks = pendingTasks
    .map(task => ({
      ...task,
      urgency: task.due_date ? clamp(10 - Math.max(daysBetween(targetDate, task.due_date), 0), 1, 10) : priorityWeight(task.priority) * 2,
    }))
    .sort((a, b) => (priorityWeight(b.priority) * 10 + b.urgency) - (priorityWeight(a.priority) * 10 + a.urgency));

  const maxTasks = energyLevel <= 2 ? 3 : energyLevel >= 4 ? 6 : 4;
  const selectedTasks = scoredTasks.slice(0, maxTasks);
  const blocks = { morning: [], afternoon: [], evening: [], night: [] };

  const push = (block, text, type) => {
    if (blocks[block].length < 5) blocks[block].push({ text, type });
  };

  push('morning', 'Breakfast and daily startup check', 'wellness');
  selectedTasks.slice(0, 2).forEach(task => push('morning', task.title, 'task'));
  if (habits[0]) push('morning', habits[0], 'habit');

  push('afternoon', 'Lunch break', 'break');
  selectedTasks.slice(2, 4).forEach(task => push('afternoon', task.title, 'task'));
  if (energyLevel <= 2) push('afternoon', '10-minute recovery walk', 'wellness');

  if (recentWorkouts.length >= 3) push('evening', 'Workout session', 'wellness');
  else push('evening', 'Light walk or stretch break', 'wellness');
  habits.slice(1, 3).forEach(habit => push('evening', habit, 'habit'));
  selectedTasks.slice(4).forEach(task => push('evening', task.title, 'task'));

  push('night', 'Dinner', 'break');
  push('night', 'Plan tomorrow and shut down open loops', 'wellness');
  push('night', 'Short reflection or journal check-in', 'habit');

  const tips = energyLevel <= 2
    ? 'Keep the day narrow: finish the top task, protect breaks, and avoid adding extra commitments.'
    : energyLevel >= 4
      ? 'Use your strongest early block for the hardest task and batch smaller admin work later.'
      : 'Alternate one demanding task block with one lower-cognitive block to stay steady through the day.';

  return {
    ...blocks,
    tips,
    intensityLabel: energyLevel <= 2 ? 'Recovery' : energyLevel >= 4 ? 'Peak output' : 'Balanced',
    summary: `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} placed across the day with ${habits.length ? `${Math.min(habits.length, 3)} habit touchpoint${Math.min(habits.length, 3) === 1 ? '' : 's'}` : 'wellness support'} and ${recentWorkouts.length >= 3 ? 'a workout block' : 'a recovery block'}.`,
  };
}

function summarizeNote(userId, title, content) {
  const plain = stripHtml(content);
  const sentences = sentenceSplit(plain);
  const existingTags = db.prepare('SELECT tags FROM notes WHERE user_id = ?').all(userId);
  const tagPool = new Set();
  existingTags.forEach(note => {
    try {
      JSON.parse(note.tags || '[]').forEach(tag => tagPool.add(String(tag).toLowerCase()));
    } catch {
      // ignore malformed tags
    }
  });

  const summarySentences = sentences.slice(0, 2);
  const summary = summarySentences.length
    ? summarySentences.join(' ')
    : `${title || 'This note'} captures ${humanList(extractKeywords(plain, 3)) || 'the main idea'} in a concise form.`;

  const keyPoints = [...new Set(
    sentences
      .filter(sentence => sentence.length >= 20)
      .sort((a, b) => extractKeywords(b, 3).length - extractKeywords(a, 3).length)
      .slice(0, 4)
  )];

  const actionItems = extractActionItems(plain);
  const keywords = extractKeywords(`${title || ''} ${plain}`, 6);
  const tags = chooseConsistentTags(tagPool, keywords);

  return {
    summary,
    tags,
    keyPoints,
    actionItems,
  };
}

function buildSpendingAnalysis(userId) {
  const startDate = addDays(todayString(), -59);
  const transactions = db.prepare(
    "SELECT type, amount, category, description, date FROM transactions WHERE user_id = ? AND date >= ? ORDER BY date"
  ).all(userId, startDate);

  if (!transactions.length) {
    return { analysis: [], savingsTips: [], spendingScore: 0, summary: 'No transaction data yet.' };
  }

  const expenses = transactions.filter(row => row.type === 'expense');
  const amounts = expenses.map(row => row.amount || 0);
  const totalExpenses = sum(amounts);
  const totalIncome = sum(transactions.filter(row => row.type === 'income').map(row => row.amount || 0));
  const anomalies = stats.anomalies(amounts, expenses.map(row => `${row.description || 'Expense'} (${row.category || 'Other'})`));
  const weeklySpend = weeklyBucketsFromTransactions(expenses);
  const weeklyValues = weeklySpend.map(bucket => bucket.total);

  const byCategory = {};
  expenses.forEach(entry => {
    const key = entry.category || 'Other';
    byCategory[key] = (byCategory[key] || 0) + entry.amount;
  });

  const frequent = {};
  expenses.forEach(entry => {
    const key = (entry.description || '').trim().toLowerCase();
    if (!key) return;
    if (!frequent[key]) frequent[key] = { count: 0, totalAmount: 0 };
    frequent[key].count += 1;
    frequent[key].totalAmount += entry.amount;
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const recurringSpend = Object.entries(frequent).filter(([, value]) => value.count >= 3);
  const concentrationIndex = herfindahlIndex(Object.values(byCategory));
  const weeklyVolatility = round(stats.stdDev(weeklyValues), 1);
  const analysis = [];

  if (topCategory) {
    analysis.push({
      title: 'Largest spending bucket',
      detail: `${topCategory[0]} absorbed ${round(topCategory[1])}, which is ${percent(topCategory[1], totalExpenses || 1)}% of expenses.`,
      type: percent(topCategory[1], totalExpenses || 1) > 40 ? 'warning' : 'pattern',
    });
  }

  if (anomalies.length) {
    const first = anomalies[0];
    analysis.push({
      title: 'Unusual transaction detected',
      detail: `${first.label || 'One transaction'} stands out against your normal range with a z-score of ${first.zScore}.`,
      type: 'warning',
    });
  }

  if (recurringSpend.length) {
    const top = recurringSpend.sort((a, b) => b[1].count - a[1].count)[0];
    analysis.push({
      title: 'Repeat spend pattern',
      detail: `${titleCase(top[0])} appeared ${top[1].count} times, averaging ${round(top[1].totalAmount / top[1].count)} per purchase.`,
      type: 'opportunity',
    });
  }

  analysis.push({
    title: 'Category concentration',
    detail: `Herfindahl concentration is ${concentrationIndex}/100, which ${concentrationIndex >= 35 ? 'means spending is concentrated in a few buckets' : 'is reasonably diversified'}.`,
    type: concentrationIndex >= 35 ? 'warning' : 'pattern',
  });

  if (weeklySpend.length >= 3) {
    analysis.push({
      title: 'Weekly volatility',
      detail: `Weekly expenses vary by about ${weeklyVolatility}, with a ${stats.trend(weeklyValues)} recent direction.`,
      type: weeklyVolatility > average(weeklyValues) * 0.25 ? 'warning' : 'pattern',
    });
  }

  const savingsTips = [];
  if (topCategory) {
    savingsTips.push({
      tip: `Set a tighter weekly cap for ${topCategory[0]} and review it midweek instead of at month end.`,
      estimatedMonthlySavings: round(topCategory[1] * 0.1),
    });
  }
  if (recurringSpend.length) {
    const top = recurringSpend[0];
    savingsTips.push({
      tip: `Audit repeated purchases like ${titleCase(top[0])} to see whether one of them can be removed or consolidated.`,
      estimatedMonthlySavings: round((top[1].totalAmount / 2)),
    });
  }

  const savingsRate = totalIncome > 0 ? percent(totalIncome - totalExpenses, totalIncome) : 0;
  const spendingScore = clamp(
    55
    + savingsRate
    - anomalies.length * 5
    - (topCategory && percent(topCategory[1], totalExpenses || 1) > 45 ? 8 : 0)
    - (concentrationIndex >= 35 ? 7 : 0)
    - (weeklySpend.length >= 3 && weeklyVolatility > average(weeklyValues) * 0.25 ? 6 : 0),
    1,
    100
  );
  const summary = spendingScore >= 70
    ? 'Spending is reasonably controlled, with a few clear optimization opportunities.'
    : 'Your spending pattern is workable but concentrated enough that one or two changes could materially improve it.';

  return {
    analysis,
    savingsTips,
    spendingScore,
    summary,
    metrics: {
      concentrationIndex,
      weeklyVolatility,
      weeklyTrend: stats.trend(weeklyValues),
    },
  };
}

function prioritizeTasks(userId) {
  const pendingTasks = db.prepare(
    "SELECT id, title, priority, due_date, category, created_at FROM tasks WHERE user_id = ? AND status != 'done' ORDER BY created_at"
  ).all(userId);
  const activeGoals = db.prepare(
    "SELECT title, category FROM goals WHERE user_id = ? AND status = 'active'"
  ).all(userId);

  const enriched = pendingTasks.map(task => {
    const ageInDays = Math.max(0, daysBetween(formatDate(task.created_at), todayString()));
    const daysUntilDue = task.due_date ? daysBetween(todayString(), task.due_date) : null;
    const goalAlignment = activeGoals.some(goal => {
      const haystack = `${goal.title} ${goal.category || ''}`.toLowerCase();
      return tokenize(task.title).some(token => haystack.includes(token)) || (task.category && haystack.includes(task.category.toLowerCase()));
    }) ? 2 : 0;
    const urgencyScore = task.due_date
      ? clamp(10 - Math.max(daysUntilDue, 0), 1, 10)
      : priorityWeight(task.priority) * 2;
    const totalScore = urgencyScore + priorityWeight(task.priority) * 3 + goalAlignment * 3 - (ageInDays > 21 ? 1 : 0);
    return {
      ...task,
      ageInDays,
      daysUntilDue,
      urgencyScore,
      totalScore,
      isStale: ageInDays > 14,
      goalAligned: !!goalAlignment,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const doFirst = enriched
    .filter(task => task.urgencyScore >= 7 || (task.goalAligned && task.priority === 'high'))
    .slice(0, 4)
    .map(task => ({
      id: task.id,
      title: task.title,
      reason: task.daysUntilDue !== null && task.daysUntilDue <= 2
        ? `Due ${relativeDateLabel(task.due_date)} with high urgency.`
        : task.goalAligned
          ? 'Directly supports an active goal and carries meaningful urgency.'
          : 'Highest combined urgency and importance score.',
    }));

  const schedule = enriched
    .filter(task => !doFirst.some(item => item.id === task.id) && task.totalScore >= 8)
    .slice(0, 4)
    .map((task, index) => ({
      id: task.id,
      title: task.title,
      suggestedDate: addDays(todayString(), Math.min(index + 1, 5)),
      reason: task.goalAligned ? 'Important, but can be placed deliberately on the calendar.' : 'Worth doing soon, but not ahead of the do-first set.',
    }));

  const delegate = enriched
    .filter(task => /email|follow up|admin|organize|schedule|book/i.test(task.title))
    .slice(0, 3)
    .map(task => ({
      id: task.id,
      title: task.title,
      reason: 'Administrative work with lower leverage than your top priorities.',
    }));

  const eliminate = enriched
    .filter(task => task.isStale && task.priority === 'low')
    .slice(0, 3)
    .map(task => ({
      id: task.id,
      title: task.title,
      reason: 'Low-priority and stale long enough that it likely needs deletion or reframing.',
    }));

  const staleTasks = enriched
    .filter(task => task.isStale)
    .slice(0, 5)
    .map(task => ({
      id: task.id,
      title: task.title,
      ageInDays: task.ageInDays,
      recommendation: task.priority === 'low' ? 'Delete or archive it unless it still matters this week.' : 'Rewrite it as a smaller next action and reschedule it explicitly.',
    }));

  return {
    matrix: { doFirst, schedule, delegate, eliminate },
    topThreeToday: doFirst.slice(0, 3).map(task => task.id),
    summary: doFirst.length
      ? 'Your best day comes from clearing the highest-urgency, highest-goal-alignment work first.'
      : 'There are no urgent blockers, so schedule one meaningful task instead of reacting to the backlog.',
    staleTasks,
  };
}

function buildHabitCoach(userId) {
  const habitStats = getHabitStatsForRange(userId, 30);
  if (!habitStats.length) return { coaching: [], summary: 'No habits tracked yet. Start by adding a few habits!', topPriority: 'Add one habit first.' };

  const coaching = habitStats.map(habit => {
    const status = classifyStatus(habit.completionRate, habit.weeklyTrend);
    const message = status === 'thriving'
      ? `${habit.label} is strong at ${habit.completionRate}% with a ${habit.currentStreak}-day streak. ${habit.bestDay ? `${habit.bestDay} is your most reliable day.` : ''}`
      : status === 'building'
        ? `${habit.label} is moving, but not locked in yet at ${habit.completionRate}% completion. ${habit.bestDay ? `${habit.bestDay} is your easiest day to protect.` : ''}`
        : `${habit.label} is slipping at ${habit.completionRate}% completion. ${habit.worstDay ? `${habit.worstDay} is the weak point to redesign.` : ''}`;
    const tip = status === 'thriving'
      ? `Protect the streak by giving ${habit.label} a weekend-safe version.`
      : status === 'building'
        ? `Pin ${habit.label} to the same time on ${habit.bestDay || 'your best day'} and repeat it there first.`
        : `Shrink ${habit.label} to a two-minute starter version and schedule it before your usual drop-off window.`;
    return { habit: habit.label, status, message, tip };
  });

  const topPriorityHabit = [...habitStats].sort((a, b) => a.completionRate - b.completionRate)[0];
  return {
    coaching,
    summary: `You are tracking ${habitStats.length} habit${habitStats.length === 1 ? '' : 's'}. The biggest upside is in tightening the habits with the lowest completion rate before adding new ones.`,
    topPriority: `${topPriorityHabit.label} should get the most attention because it has the weakest current consistency.`,
  };
}

function buildJournalPrompt(userId) {
  const today = todayString();
  const dayOfWeek = DAY_NAMES[new Date().getDay()];
  const recentEntries = db.prepare(
    'SELECT text, mood, date FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 7'
  ).all(userId);
  const todayTasks = db.prepare(
    'SELECT title, status FROM tasks WHERE user_id = ? AND due_date = ?'
  ).all(userId, today);
  const habits = db.prepare('SELECT label, id FROM habits WHERE user_id = ?').all(userId);
  const completions = db.prepare(
    'SELECT habit_id FROM habit_completions WHERE user_id = ? AND completed_date = ?'
  ).all(userId, today);

  const moodTrend = stats.trend(recentEntries.map(entry => getMoodScore(entry.mood)));
  const usedThemes = new Set(extractKeywords(recentEntries.map(entry => entry.text).join(' '), 8));
  const incompleteTask = todayTasks.find(task => task.status !== 'done');
  const incompleteHabit = habits.find(habit => !completions.some(row => row.habit_id === habit.id));

  const prompts = [];
  if (incompleteTask) {
    prompts.push({
      prompt: `What would make "${incompleteTask.title}" feel clearer or lighter before tomorrow?`,
      category: 'growth',
    });
  }
  if (incompleteHabit) {
    prompts.push({
      prompt: `What gets in the way of ${incompleteHabit.label} on days like this, and what would remove that friction?`,
      category: 'reflection',
    });
  }
  if (!usedThemes.has('grateful')) {
    prompts.push({
      prompt: 'Which part of today quietly went better than expected, and why did it matter?',
      category: 'gratitude',
    });
  }
  prompts.push({
    prompt: dayOfWeek === 'Monday'
      ? 'What kind of week would feel successful even if everything does not get finished?'
      : dayOfWeek === 'Friday' || dayOfWeek === 'Saturday'
        ? 'What would make this weekend feel restorative instead of just full?'
        : 'Where did you spend your best attention today, and was it worth it?',
    category: dayOfWeek === 'Monday' ? 'growth' : 'mindfulness',
  });

  return {
    prompts: prompts.slice(0, 3),
    dailyAffirmation: moodTrend === 'declining'
      ? 'Aim for a smaller win, not a perfect day.'
      : moodTrend === 'improving'
        ? 'The routines that are helping are worth repeating on purpose.'
        : 'Steady progress counts when your system is consistent.',
  };
}

function inferGoalTracks(goalTitle) {
  const lower = goalTitle.toLowerCase();
  if (/(learn|study|course|exam|certification)/.test(lower)) return ['Define the learning scope', 'Complete the main learning blocks', 'Practice and apply', 'Review and measure'];
  if (/(build|launch|app|product|website|project|feature)/.test(lower)) return ['Clarify the outcome', 'Build the core version', 'Test and refine', 'Launch and review'];
  if (/(save|money|fund|debt)/.test(lower)) return ['Set the target and rule set', 'Create the funding habit', 'Track progress weekly', 'Close the remaining gap'];
  if (/(fitness|weight|run|workout|health)/.test(lower)) return ['Define the baseline', 'Establish the weekly routine', 'Track progress markers', 'Consolidate the habit'];
  return ['Define the outcome', 'Create the first milestone', 'Execute the main work', 'Review and finish'];
}

function buildGoalBreakdown(userId, goal) {
  const today = todayString();
  const daysRemaining = goal.target_date ? Math.max(0, daysBetween(today, goal.target_date)) : null;
  const completedLast30 = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= date('now', '-30 days')"
  ).get(userId);
  const taskVelocity = round((completedLast30.count || 0) / 30, 1);
  const competingGoals = db.prepare(
    "SELECT title FROM goals WHERE user_id = ? AND status = 'active' AND title != ? ORDER BY updated_at DESC LIMIT 5"
  ).all(userId, goal.title).map(row => row.title);
  const phases = inferGoalTracks(goal.title);
  const milestones = phases.map((phase, index) => ({
    title: phase,
    description: `${phase} is complete with a clear deliverable and next step defined.`,
    targetDate: daysRemaining !== null ? addDays(today, Math.round((index + 1) * (daysRemaining / phases.length))) : null,
    tasks: [
      { title: `Plan ${phase.toLowerCase()}`, priority: index === 0 ? 'high' : 'medium' },
      { title: `Execute the key work for ${phase.toLowerCase()}`, priority: 'high' },
      { title: `Review progress for ${phase.toLowerCase()}`, priority: 'medium' },
    ],
    percentOfGoal: index === phases.length - 1 ? 100 - (Math.floor(100 / phases.length) * index) : Math.floor(100 / phases.length),
  }));

  const weeklyActions = [
    `Choose the single most important milestone for ${goal.title}.`,
    'Schedule two protected work blocks for it this week.',
    'Define a visible done-state for the next task before you start.',
  ];
  if (taskVelocity < 1) weeklyActions.push('Reduce scope until the next step is realistic inside one sitting.');
  if (competingGoals.length) weeklyActions.push(`Explicitly de-prioritize ${competingGoals[0]} while this goal is in a push week.`);

  return {
    milestones,
    weeklyActions: weeklyActions.slice(0, 5),
    potentialBlockers: [
      'Trying to move every milestone at once instead of sequencing them.',
      'Leaving tasks too vague to start quickly.',
      competingGoals.length ? `Attention split across competing goals like ${humanList(competingGoals.slice(0, 2))}.` : null,
      daysRemaining !== null && daysRemaining < 21 ? 'The deadline is tight enough that buffer time needs to be intentional.' : 'Losing momentum because progress is not reviewed weekly.',
    ].filter(Boolean),
    motivationalNote: 'Progress accelerates once the next visible milestone is small enough to start without hesitation.',
    estimatedCompletionWeeks: daysRemaining !== null ? Math.max(1, Math.ceil(daysRemaining / 7)) : Math.max(2, Math.ceil((milestones.length * 2) / Math.max(taskVelocity || 0.5, 0.5))),
  };
}

function buildBookRecommendation(userId) {
  const books = db.prepare('SELECT title, author, status, rating, notes FROM books WHERE user_id = ?').all(userId);
  const ownedTitles = new Set(books.map(book => book.title.toLowerCase()));
  const rated = books.filter(book => book.rating >= 4);
  const avgRating = rated.length ? round(average(rated.map(book => book.rating)), 1) : null;
  const topRatedTitles = rated.slice(0, 5).map(book => book.title);
  const themes = extractThemesFromBooks(rated.length ? rated : books);

  const scored = BOOK_CATALOG
    .filter(book => !ownedTitles.has(book.title.toLowerCase()))
    .map(book => {
      const overlap = book.tags.filter(tag => themes.includes(tag) || themes.some(theme => tag.includes(theme) || theme.includes(tag)));
      const matchScore = clamp(55 + overlap.length * 15 + (rated.length ? 10 : 0), 1, 100);
      return {
        ...book,
        overlap,
        matchScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  return {
    recommendations: (scored.length ? scored : BOOK_CATALOG.filter(book => !ownedTitles.has(book.title.toLowerCase())).slice(0, 3)).map(book => ({
      title: book.title,
      author: book.author,
      reason: book.overlap?.length
        ? `This matches your interest in ${humanList(book.overlap)} based on the books you rated highest.`
        : rated.length
          ? `You rate books around ${avgRating}/5 on average, and this complements favorites like ${humanList(topRatedTitles.slice(0, 2)) || 'your top-rated reads'} while adding a slightly different angle.`
          : 'This is a strong all-round recommendation to establish your reading taste inside the app.',
      matchScore: book.matchScore || 60,
    })),
  };
}

function buildWellnessCorrelations(userId) {
  const startDate = addDays(todayString(), -59);
  const sleep = db.prepare(
    'SELECT date, duration_minutes, quality FROM sleep_logs WHERE user_id = ? AND date >= ? ORDER BY date'
  ).all(userId, startDate);
  const moods = db.prepare(
    'SELECT mood, date FROM journal_entries WHERE user_id = ? AND date >= ? ORDER BY date'
  ).all(userId, startDate);
  const workouts = db.prepare(
    'SELECT date, COUNT(*) as exercises, SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as completed FROM workouts WHERE user_id = ? AND date >= ? GROUP BY date'
  ).all(userId, startDate);
  const tasks = db.prepare(
    "SELECT date(updated_at) as date, COUNT(*) as completed FROM tasks WHERE user_id = ? AND status = 'done' AND updated_at >= ? GROUP BY date(updated_at)"
  ).all(userId, startDate);
  const focus = db.prepare(
    'SELECT session_date as date, count as sessions FROM timer_sessions WHERE user_id = ? AND session_date >= ?'
  ).all(userId, startDate);
  const habits = db.prepare('SELECT id FROM habits WHERE user_id = ?').all(userId);
  const habitCompletions = db.prepare(
    'SELECT habit_id, completed_date FROM habit_completions WHERE user_id = ? AND completed_date >= ?'
  ).all(userId, startDate);
  const meals = db.prepare(
    'SELECT date, SUM(calories) as totalCalories FROM meals WHERE user_id = ? AND date >= ? GROUP BY date'
  ).all(userId, startDate);
  const water = db.prepare(
    'SELECT date, SUM(amount_ml) as totalMl FROM water_logs WHERE user_id = ? AND date >= ? GROUP BY date'
  ).all(userId, startDate);

  const dataPoints = {
    sleep: sleep.length,
    moods: moods.length,
    workouts: workouts.length,
    tasks: tasks.length,
    focus: focus.length,
    meals: meals.length,
    water: water.length,
  };

  const totalPoints = sum(Object.values(dataPoints));
  if (totalPoints < 10) {
    return {
      correlations: [],
      bestDayProfile: { description: 'Not enough data yet to define what your strongest days look like.' },
      riskFactors: [],
      summary: 'Not enough data yet. Keep tracking for at least two weeks to reveal stable correlations.',
      dataPoints,
      rawCorrelations: {},
    };
  }

  const allDates = [];
  for (let cursor = parseDate(startDate); cursor <= parseDate(todayString()); cursor.setDate(cursor.getDate() + 1)) {
    allDates.push(formatDate(cursor));
  }

  const series = {
    sleep: allDates.map(date => {
      const entry = sleep.find(row => row.date === date);
      return entry ? (entry.duration_minutes || 0) / 60 : null;
    }),
    sleepQ: allDates.map(date => sleep.find(row => row.date === date)?.quality || null),
    mood: allDates.map(date => {
      const entry = moods.find(row => row.date === date);
      return entry ? getMoodScore(entry.mood) : null;
    }),
    exercise: allDates.map(date => workouts.find(row => row.date === date)?.completed ? 1 : 0),
    tasks: allDates.map(date => tasks.find(row => row.date === date)?.completed || 0),
    focus: allDates.map(date => focus.find(row => row.date === date)?.sessions || 0),
    calories: allDates.map(date => meals.find(row => row.date === date)?.totalCalories || null),
    water: allDates.map(date => water.find(row => row.date === date)?.totalMl || null),
    habits: allDates.map(date => habits.length
      ? percent(habitCompletions.filter(row => row.completed_date === date).length, habits.length)
      : null),
  };

  const rawCorrelations = {};
  [
    ['sleep', 'mood', 'Sleep duration to next-day mood', 1],
    ['sleepQ', 'mood', 'Sleep quality to mood', 1],
    ['exercise', 'mood', 'Exercise to mood', 0],
    ['exercise', 'tasks', 'Exercise to task completion', 0],
    ['sleep', 'tasks', 'Sleep to productivity', 1],
    ['sleep', 'focus', 'Sleep to focus sessions', 1],
    ['focus', 'tasks', 'Focus to completed tasks', 0],
    ['water', 'focus', 'Hydration to focus', 0],
    ['water', 'mood', 'Hydration to mood', 0],
    ['calories', 'mood', 'Nutrition to mood', 0],
    ['habits', 'mood', 'Habit consistency to mood', 0],
    ['habits', 'tasks', 'Habit consistency to productivity', 0],
  ].forEach(([xKey, yKey, label, lag]) => {
    let x = series[xKey];
    let y = series[yKey];
    if (lag > 0) {
      x = x.slice(0, -lag);
      y = y.slice(lag);
    }
    const valid = x.map((value, index) => [value, y[index]]).filter(([a, b]) => a !== null && b !== null);
    if (valid.length >= 7) {
      const r = stats.correlation(valid.map(pair => pair[0]), valid.map(pair => pair[1]));
      if (r !== null && Math.abs(r) > 0.15) {
        rawCorrelations[label] = {
          r,
          strength: Math.abs(r) > 0.6 ? 'strong' : Math.abs(r) > 0.35 ? 'moderate' : 'weak',
          direction: r > 0 ? 'positive' : 'negative',
          dataPoints: valid.length,
          lagged: lag > 0,
        };
      }
    }
  });

  const correlations = buildCorrelationInsights(rawCorrelations, 0.15).map(([title, value]) => ({
    title,
    finding: `${value.lagged ? 'Lagged data suggests' : 'The data suggests'} a ${value.strength} ${value.direction} relationship (r=${value.r}) across ${value.dataPoints} matched days.`,
    dimensions: title.split(' to ').map(part => part.trim()),
    strength: value.strength,
    actionable: value.direction === 'positive'
      ? `Protect the input on the left-hand side of this relationship more consistently for two weeks and watch the downstream metric.`
      : `Reduce the input on the left-hand side when you can, because it appears to move against the outcome.`,
  }));

  const bestDays = allDates.filter(date => {
    const index = allDates.indexOf(date);
    return series.mood[index] !== null && series.mood[index] >= 4 && series.tasks[index] >= 2;
  });

  const bestDayProfile = bestDays.length >= 3
    ? {
        description: `Your strongest tracked days usually combine about ${round(average(bestDays.map(date => series.sleep[allDates.indexOf(date)]).filter(Boolean)), 1)} hours of sleep with ${Math.round(average(bestDays.map(date => series.habits[allDates.indexOf(date)]).filter(value => value !== null)))}% habit completion.`,
      }
    : { description: 'You do not have enough top-performing days yet to form a stable profile.' };

  const riskFactors = [];
  if (series.sleep.filter(value => value !== null && value < 6).length >= 3) riskFactors.push('Sleep dropping below 6 hours');
  if (habits.length && series.habits.filter(value => value !== null && value < 40).length >= 3) riskFactors.push('Habit completion falling below 40%');
  if (series.water.filter(value => value !== null && value < 1200).length >= 3) riskFactors.push('Hydration consistently staying low');

  return {
    correlations,
    bestDayProfile,
    riskFactors,
    summary: correlations.length
      ? 'Your wellness data is showing repeatable patterns. The most valuable change is to reinforce the strongest positive relationship first.'
      : 'You have enough data to track, but the relationships are still too weak or inconsistent to over-interpret yet.',
    dataPoints,
    rawCorrelations,
  };
}

function buildChatReply(userId, message, context = []) {
  const lower = (message || '').toLowerCase();
  const priorTexts = (context || []).map(entry => entry?.content || entry?.text || '').filter(Boolean);
  const inferredDomain = detectDomain(message) || detectDomain(priorTexts.slice().reverse().find(Boolean));

  if (inferredDomain === 'finance') return runDataQuery(userId, message).answer;
  if (inferredDomain === 'habits') return runDataQuery(userId, message).answer;
  if (inferredDomain === 'tasks') {
    const plan = prioritizeTasks(userId);
    const first = plan.matrix.doFirst[0];
    return first
      ? `Start with "${first.title}". ${first.reason} ${plan.matrix.doFirst[1] ? `Next after that: "${plan.matrix.doFirst[1].title}".` : ''}`
      : plan.summary;
  }
  if (inferredDomain === 'workout') {
    const workout = buildWorkoutSuggestion(userId);
    return `${workout.reasoning} Start with ${workout.exercises.slice(0, 3).map(ex => ex.exercise).join(', ')}.`;
  }
  if (inferredDomain === 'weekly') {
    const range = getCurrentWeekRange();
    return buildWeeklyReview(userId, range.start, range.end);
  }
  if (inferredDomain === 'wellness') {
    const insights = buildMoodInsights(userId);
    return insights.insights[0]?.detail || insights.overallTrend;
  }
  if (inferredDomain === 'goals') {
    const goal = db.prepare(
      "SELECT * FROM goals WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1"
    ).get(userId);
    if (!goal) return 'You do not have an active goal tracked right now.';
    const breakdown = buildGoalBreakdown(userId, goal);
    return `Your freshest active goal is "${goal.title}". This week, ${breakdown.weeklyActions.slice(0, 2).join(' and ')}.`;
  }

  const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status != 'done'").get(userId)?.count || 0;
  const goals = db.prepare("SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = 'active'").get(userId)?.count || 0;
  return `I can answer questions about your tasks, habits, spending, focus, sleep, goals, and wellness. Right now you have ${taskCount} open task${taskCount === 1 ? '' : 's'} and ${goals} active goal${goals === 1 ? '' : 's'}.`;
}

function convertCapture(content) {
  const clean = stripHtml(content);
  const lower = clean.toLowerCase();
  const looksLikeTask = /\b(todo|need to|should|must|follow up|call|email|schedule|book|submit|finish|review|buy|plan|prepare)\b/.test(lower);
  const type = looksLikeTask ? 'task' : 'note';

  if (type === 'task') {
    return {
      type,
      task: {
        title: titleCase(clean.replace(/\b(todo|need to|should|must)\b/ig, '').trim()) || 'Follow up',
        priority: /\burgent|asap|today|tomorrow\b/.test(lower) ? 'high' : /\bsoon|this week\b/.test(lower) ? 'medium' : 'low',
        category: inferTransactionCategory(clean, ['Work', 'Personal', 'Admin', 'Errands']) === 'General' ? 'Inbox' : inferTransactionCategory(clean, ['Work', 'Personal', 'Admin', 'Errands']),
      },
    };
  }

  return {
    type,
    note: {
      title: titleCase(clean.split(/[.!?]/)[0].slice(0, 60)) || 'Quick note',
      content: clean,
      tags: extractKeywords(clean, 3),
    },
  };
}

module.exports = {
  buildBriefing,
  buildBriefingPayload,
  parseTransaction,
  buildJournalReflection,
  breakTaskPlan,
  buildFinancialAdvice,
  buildWorkoutSuggestion,
  buildMealSuggestion,
  runDataQuery,
  buildWeeklyReview,
  buildMoodInsights,
  buildSmartSchedule,
  summarizeNote,
  buildChatReply,
  buildBookRecommendation,
  buildHabitCoach,
  buildSpendingAnalysis,
  prioritizeTasks,
  buildJournalPrompt,
  buildGoalBreakdown,
  buildWellnessCorrelations,
  convertCapture,
};
