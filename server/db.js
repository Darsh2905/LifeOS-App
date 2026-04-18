const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'lifeos.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
    last_login_at TEXT,
    last_login_ip TEXT,
    login_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('wallet','bank','credit_card','savings')),
    balance REAL DEFAULT 0,
    color TEXT DEFAULT '#9333ea',
    icon TEXT DEFAULT 'wallet',
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
    amount REAL NOT NULL,
    description TEXT,
    category TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, category, month)
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    color TEXT DEFAULT '#9333ea',
    icon TEXT DEFAULT 'piggy-bank',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recurring_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount REAL NOT NULL,
    description TEXT,
    category TEXT,
    frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','biweekly','monthly','yearly')),
    next_due TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    category TEXT DEFAULT 'Work',
    due_date TEXT,
    recurring TEXT DEFAULT 'none',
    last_completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    color TEXT,
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '',
    color TEXT DEFAULT '#9333ea',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date TEXT NOT NULL,
    UNIQUE(habit_id, completed_date)
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    mood TEXT DEFAULT '😊',
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise TEXT NOT NULL,
    sets INTEGER DEFAULT 3,
    reps INTEGER DEFAULT 10,
    weight REAL,
    duration INTEGER,
    done INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT '🍳 Breakfast',
    calories INTEGER,
    eaten INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS timer_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    focus_duration INTEGER DEFAULT 3600,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, session_date)
  );

  CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    top_priorities TEXT DEFAULT '[]',
    schedule TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    energy_level INTEGER,
    reflection TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
  CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
  CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
  CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
  CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
  CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);
  CREATE INDEX IF NOT EXISTS idx_timer_sessions_user ON timer_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_plans(user_id, date);

  -- ── User Settings ──
  CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, key)
  );

  -- ── AI Conversations ──
  CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    reference_id TEXT,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── AI Briefing Cache ──
  CREATE TABLE IF NOT EXISTS ai_briefings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  -- ── Streaks ──
  CREATE TABLE IF NOT EXISTS streaks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    ref_id TEXT,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    freeze_days_used INTEGER DEFAULT 0,
    freeze_days_allowed INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, type, ref_id)
  );

  -- ── Achievements ──
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    unlocked_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, key)
  );

  -- ── User XP ──
  CREATE TABLE IF NOT EXISTS user_xp (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Goals ──
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'personal',
    target_date TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','abandoned')),
    progress INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Goal Milestones ──
  CREATE TABLE IF NOT EXISTS goal_milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    linked_type TEXT,
    linked_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Dismissed Suggestions ──
  CREATE TABLE IF NOT EXISTS dismissed_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suggestion_key TEXT NOT NULL,
    dismissed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, suggestion_key)
  );

  -- ── Activity Log ──
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    summary TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Sleep Logs ──
  CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    bedtime TEXT,
    wake_time TEXT,
    duration_minutes INTEGER,
    quality INTEGER CHECK(quality BETWEEN 1 AND 5),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  -- ── Water Logs ──
  CREATE TABLE IF NOT EXISTS water_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Books ──
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    status TEXT DEFAULT 'to_read' CHECK(status IN ('to_read','reading','finished')),
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Quick Captures ──
  CREATE TABLE IF NOT EXISTS quick_captures (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'note' CHECK(type IN ('note','task','idea')),
    processed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Medications ──
  CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT DEFAULT 'daily',
    time_of_day TEXT DEFAULT 'morning',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Medication Logs ──
  CREATE TABLE IF NOT EXISTS medication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    taken_date TEXT NOT NULL,
    taken_at TEXT,
    UNIQUE(medication_id, taken_date)
  );

  -- ── New Indexes ──
  CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, key);
  CREATE INDEX IF NOT EXISTS idx_ai_conversations ON ai_conversations(user_id, feature);
  CREATE INDEX IF NOT EXISTS idx_ai_briefings ON ai_briefings(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones(goal_id);
  CREATE INDEX IF NOT EXISTS idx_dismissed_suggestions ON dismissed_suggestions(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_sleep_logs ON sleep_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_water_logs ON water_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
  CREATE INDEX IF NOT EXISTS idx_quick_captures ON quick_captures(user_id, processed);
  CREATE INDEX IF NOT EXISTS idx_medications ON medications(user_id);
  CREATE INDEX IF NOT EXISTS idx_medication_logs ON medication_logs(medication_id, taken_date);
`);

// ── Migrations for users table (idempotent) ──
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

const userColumnMigrations = [
  { name: 'role', ddl: "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'" },
  { name: 'status', ddl: "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'" },
  { name: 'last_login_at', ddl: "ALTER TABLE users ADD COLUMN last_login_at TEXT" },
  { name: 'last_login_ip', ddl: "ALTER TABLE users ADD COLUMN last_login_ip TEXT" },
  { name: 'login_count', ddl: 'ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0' },
  { name: 'email_verified', ddl: 'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0' },
];

for (const { name, ddl } of userColumnMigrations) {
  if (!columnExists('users', name)) {
    try { db.exec(ddl); } catch (e) { console.warn(`Migration for users.${name} failed:`, e.message); }
  }
}

// Google OAuth / Calendar integration
db.exec(`
  CREATE TABLE IF NOT EXISTS google_tokens (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    google_sub TEXT NOT NULL,
    google_email TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER NOT NULL,
    scope TEXT,
    connected_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_google_tokens_sub ON google_tokens(google_sub);
`);

// Mapping from a LifeOS task to its corresponding Google Calendar event
db.exec(`
  CREATE TABLE IF NOT EXISTS task_calendar_events (
    task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL DEFAULT 'primary',
    last_synced_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_task_calendar_user ON task_calendar_events(user_id);
`);

// Link Google accounts for "Sign in with Google"
const userColumnMigrationsAuth = [
  { name: 'google_sub', ddl: 'ALTER TABLE users ADD COLUMN google_sub TEXT' },
  { name: 'avatar_url', ddl: 'ALTER TABLE users ADD COLUMN avatar_url TEXT' },
];
for (const { name, ddl } of userColumnMigrationsAuth) {
  if (!columnExists('users', name)) {
    try { db.exec(ddl); } catch (e) { console.warn(`Migration for users.${name} failed:`, e.message); }
  }
}
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL');
} catch (e) { console.warn('google_sub index:', e.message); }

// Make password nullable for Google-only users (SQLite has no ALTER COLUMN,
// so new Google accounts insert a synthetic empty-string password instead).

// Verification tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'email' CHECK(type IN ('email','password_reset')),
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_verification_tokens ON verification_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_tokens(user_id, type);
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');

// Promote admin from env (ADMIN_EMAIL). If not present, nothing happens.
const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
if (adminEmail) {
  try {
    const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ? AND role != 'admin'").run(adminEmail);
    if (result.changes > 0) {
      console.log(`[auth] Promoted ${adminEmail} to admin.`);
    }
  } catch (e) {
    console.warn('[auth] Admin promotion failed:', e.message);
  }
}

module.exports = db;
