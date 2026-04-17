const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { checkRate } = require('../services/claude');
const { getWeeklySummaryData } = require('../services/dataCollector');
const {
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
} = require('../services/localIntelligence');
const { getWeather } = require('../services/weather');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rateGuard(req, res) {
  if (!checkRate(req.userId)) {
    res.status(429).json({ error: 'AI rate limit exceeded. Please wait a moment.' });
    return false;
  }
  return true;
}

router.get('/briefing', authenticate, async (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const cached = db.prepare('SELECT * FROM ai_briefings WHERE user_id = ? AND date = ?').get(req.userId, date);
    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < 4 * 60 * 60 * 1000) {
        const citySetting = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'weather_city'").get(req.userId);
        const weather = citySetting ? await getWeather(citySetting.value) : null;
        const { signals } = buildBriefingPayload(req.userId, date, weather?.current || null);
        return res.json({ briefing: cached.content, signals, date, cached: true });
      }
    }

    const citySetting = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'weather_city'").get(req.userId);
    const weather = citySetting ? await getWeather(citySetting.value) : null;
    const { briefing, signals } = buildBriefingPayload(req.userId, date, weather?.current || null);

    if (cached) {
      db.prepare("UPDATE ai_briefings SET content = ?, created_at = datetime('now') WHERE id = ?").run(briefing, cached.id);
    } else {
      db.prepare('INSERT INTO ai_briefings (id, user_id, date, content) VALUES (?, ?, ?, ?)').run(genId(), req.userId, date, briefing);
    }
    res.json({ briefing, signals, date, cached: false });
  } catch (err) {
    console.error('Briefing error:', err.message);
    res.status(500).json({ error: 'Failed to generate briefing.' });
  }
});

router.post('/briefing/regenerate', authenticate, async (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const date = req.body.date || new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM ai_briefings WHERE user_id = ? AND date = ?').run(req.userId, date);

    const citySetting = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'weather_city'").get(req.userId);
    const weather = citySetting ? await getWeather(citySetting.value) : null;
    const { briefing, signals } = buildBriefingPayload(req.userId, date, weather?.current || null);

    db.prepare('INSERT INTO ai_briefings (id, user_id, date, content) VALUES (?, ?, ?, ?)').run(genId(), req.userId, date, briefing);
    res.json({ briefing, signals, date, cached: false });
  } catch (err) {
    console.error('Briefing regenerate error:', err.message);
    res.status(500).json({ error: 'Failed to regenerate briefing.' });
  }
});

router.post('/parse-transaction', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required.' });

    const parsed = parseTransaction(req.userId, text);
    if (!parsed.amount || parsed.amount <= 0) return res.status(400).json({ error: 'Could not parse amount.' });
    res.json({ parsed, original: text });
  } catch (err) {
    console.error('Parse transaction error:', err.message);
    res.status(500).json({ error: 'Failed to parse transaction.' });
  }
});

router.post('/journal-reflect', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { entryId, text, mood } = req.body;
    if (!text) return res.status(400).json({ error: 'Journal text is required.' });

    if (entryId) {
      const cached = db.prepare(
        "SELECT content FROM ai_conversations WHERE user_id = ? AND feature = 'journal' AND reference_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
      ).get(req.userId, entryId);
      if (cached) return res.json(JSON.parse(cached.content));
    }

    const result = buildJournalReflection(req.userId, text, mood);
    if (entryId) {
      db.prepare('INSERT INTO ai_conversations (id, user_id, feature, reference_id, role, content) VALUES (?, ?, ?, ?, ?, ?)')
        .run(genId(), req.userId, 'journal', entryId, 'assistant', JSON.stringify(result));
    }

    res.json(result);
  } catch (err) {
    console.error('Journal reflect error:', err.message);
    res.status(500).json({ error: 'Failed to generate reflection.' });
  }
});

router.get('/journal-reflect/:entryId', authenticate, (req, res) => {
  const cached = db.prepare(
    "SELECT content FROM ai_conversations WHERE user_id = ? AND feature = 'journal' AND reference_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
  ).get(req.userId, req.params.entryId);
  if (!cached) return res.status(404).json({ error: 'No reflection found.' });
  res.json(JSON.parse(cached.content));
});

router.post('/break-task', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { title, dueDate, context } = req.body;
    if (!title) return res.status(400).json({ error: 'Task title is required.' });
    res.json(breakTaskPlan(req.userId, title, dueDate, context));
  } catch (err) {
    console.error('Break task error:', err.message);
    res.status(500).json({ error: 'Failed to break down task.' });
  }
});

router.get('/financial-advice', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildFinancialAdvice(req.userId));
  } catch (err) {
    console.error('Financial advice error:', err.message);
    res.status(500).json({ error: 'Failed to generate financial advice.' });
  }
});

router.get('/workout-suggestion', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildWorkoutSuggestion(req.userId));
  } catch (err) {
    console.error('Workout suggestion error:', err.message);
    res.status(500).json({ error: 'Failed to generate workout suggestion.' });
  }
});

router.post('/meal-suggestion', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { calorieTarget, preferences } = req.body;
    res.json(buildMealSuggestion(req.userId, calorieTarget, preferences));
  } catch (err) {
    console.error('Meal suggestion error:', err.message);
    res.status(500).json({ error: 'Failed to generate meal suggestion.' });
  }
});

router.post('/query', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });
    res.json(runDataQuery(req.userId, query));
  } catch (err) {
    console.error('AI query error:', err.message);
    res.status(500).json({ error: 'Failed to process query.' });
  }
});

router.get('/weekly-review', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates are required.' });

    const statsData = getWeeklySummaryData(req.userId, start, end);
    const prevStart = new Date(`${start}T00:00:00`);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(`${start}T00:00:00`);
    prevEnd.setDate(prevEnd.getDate() - 1);

    let deltas = null;
    try {
      const prevData = getWeeklySummaryData(req.userId, prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]);
      deltas = {
        tasksCompleted: statsData.tasks.completed - prevData.tasks.completed,
        habitRate: statsData.habits.avgCompletionRate - prevData.habits.avgCompletionRate,
        focusMinutes: statsData.focus.totalMinutes - prevData.focus.totalMinutes,
        expenses: statsData.finance.expenses - prevData.finance.expenses,
      };
    } catch {
      deltas = null;
    }

    res.json({ review: buildWeeklyReview(req.userId, start, end), stats: statsData, deltas });
  } catch (err) {
    console.error('Weekly review error:', err.message);
    res.status(500).json({ error: 'Failed to generate weekly review.' });
  }
});

router.get('/mood-insights', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildMoodInsights(req.userId));
  } catch (err) {
    console.error('Mood insights error:', err.message);
    res.status(500).json({ error: 'Failed to generate mood insights.' });
  }
});

router.post('/smart-schedule', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { date, energyLevel } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    res.json(buildSmartSchedule(req.userId, targetDate, Number(energyLevel) || 3));
  } catch (err) {
    console.error('Smart schedule error:', err.message);
    res.status(500).json({ error: 'Failed to generate smart schedule.' });
  }
});

router.post('/summarize-note', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { title, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required.' });
    res.json(summarizeNote(req.userId, title, content));
  } catch (err) {
    console.error('Summarize note error:', err.message);
    res.status(500).json({ error: 'Failed to summarize note.' });
  }
});

router.post('/chat', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const reply = buildChatReply(req.userId, message, context);
    db.prepare('INSERT INTO ai_conversations (id, user_id, feature, role, content) VALUES (?, ?, ?, ?, ?)')
      .run(genId(), req.userId, 'chat', 'user', message);
    db.prepare('INSERT INTO ai_conversations (id, user_id, feature, role, content) VALUES (?, ?, ?, ?, ?)')
      .run(genId(), req.userId, 'chat', 'assistant', reply);

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'Failed to process message.' });
  }
});

router.get('/book-recommendation', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildBookRecommendation(req.userId));
  } catch (err) {
    console.error('Book recommendation error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

router.get('/habit-coach', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildHabitCoach(req.userId));
  } catch (err) {
    console.error('Habit coach error:', err.message);
    res.status(500).json({ error: 'Failed to generate habit coaching.' });
  }
});

router.get('/spending-analysis', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildSpendingAnalysis(req.userId));
  } catch (err) {
    console.error('Spending analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze spending patterns.' });
  }
});

router.post('/task-prioritize', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(prioritizeTasks(req.userId));
  } catch (err) {
    console.error('Task prioritize error:', err.message);
    res.status(500).json({ error: 'Failed to prioritize tasks.' });
  }
});

router.get('/journal-prompt', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildJournalPrompt(req.userId));
  } catch (err) {
    console.error('Journal prompt error:', err.message);
    res.status(500).json({ error: 'Failed to generate journal prompts.' });
  }
});

router.post('/goal-breakdown', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    const { goalId, title, deadline } = req.body;

    let goal = null;
    if (goalId) {
      goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, req.userId);
      if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    } else {
      if (!title) return res.status(400).json({ error: 'Goal title or goalId is required.' });
      goal = { title, target_date: deadline, progress: 0 };
    }

    res.json(buildGoalBreakdown(req.userId, goal));
  } catch (err) {
    console.error('Goal breakdown error:', err.message);
    res.status(500).json({ error: 'Failed to break down goal.' });
  }
});

router.get('/wellness-correlations', authenticate, (req, res) => {
  try {
    if (!rateGuard(req, res)) return;
    res.json(buildWellnessCorrelations(req.userId));
  } catch (err) {
    console.error('Wellness correlations error:', err.message);
    res.status(500).json({ error: 'Failed to analyze wellness correlations.' });
  }
});

module.exports = router;
