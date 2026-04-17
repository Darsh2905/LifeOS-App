require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.APP_URL].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/timer', require('./routes/timer'));
app.use('/api/planner', require('./routes/planner'));

// AI & Intelligence
app.use('/api/ai', require('./routes/ai'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/streaks', require('./routes/streaks'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/search', require('./routes/search'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/backup', require('./routes/backup'));
// Weather & Settings
app.use('/api/weather', require('./routes/weather'));
app.use('/api/settings', require('./routes/settings'));
// Lifestyle
app.use('/api/sleep', require('./routes/sleep'));
app.use('/api/water', require('./routes/water'));
app.use('/api/books', require('./routes/books'));
app.use('/api/capture', require('./routes/capture'));
app.use('/api/medications', require('./routes/medications'));

// Health check (reports which optional services are configured)
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  services: {
    ai: true,
    llm: !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
    weather: !!process.env.WEATHER_API_KEY,
  },
}));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'build', 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LifeOS server running on http://localhost:${PORT}`);
});
