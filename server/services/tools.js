// ═══════════════════════════════════════════════════════════════════════════════
// Agent Tool Registry — the actions LifeOS AI can take on your data.
// Each tool exposes a JSON-schema (OpenAI-compat) + a direct-DB executor.
// Executors return { success, message, data } so the agent can reason on them.
// ═══════════════════════════════════════════════════════════════════════════════

const db = require('../db');
const taskSync = require('./taskSync');

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function taskToClient(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date,
    recurring: row.recurring,
  };
}

function noteToClient(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    pinned: !!row.pinned,
  };
}

// ─── Risk levels ───
// low    — auto-executes, non-destructive create/log/toggle actions
// medium — auto-executes with visible card, updates
// high   — would require confirmation in client (deletes, bulk ops)
// (agent always reports what it did; confirmation UI is client-side)

// ─── Tool registry ───
const TOOLS = {
  // ══════════════════ TASKS ══════════════════

  create_task: {
    description: 'Create a new task (todo item). Use when the user asks to add, remind, or track something. Priority defaults to medium. due_date accepts YYYY-MM-DD or natural phrases like "today", "tomorrow", "friday".',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Clear task title' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD (null/empty if no date)' },
        category: { type: 'string', description: 'e.g. Work, Personal, Errands, Health' },
        recurring: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
      },
      required: ['title'],
    },
    execute: (userId, args) => {
      const id = genId();
      const now = new Date().toISOString();
      const dueDate = normalizeDate(args.due_date);
      db.prepare(
        'INSERT INTO tasks (id, user_id, title, status, priority, category, due_date, recurring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, userId, args.title, 'todo', args.priority || 'medium', args.category || 'Work', dueDate, args.recurring || 'none', now, now);
      const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (row.due_date) taskSync.syncTask(userId, row);
      return { success: true, message: `Created task "${args.title}"`, data: taskToClient(row) };
    },
  },

  update_task: {
    description: 'Modify an existing task. Provide task_id plus any fields to update.',
    risk: 'medium',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        title: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD or null to clear' },
        category: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
      },
      required: ['task_id'],
    },
    execute: (userId, args) => {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(args.task_id, userId);
      if (!existing) return { success: false, message: `Task ${args.task_id} not found` };
      const now = new Date().toISOString();
      const dueDate = args.due_date !== undefined ? normalizeDate(args.due_date) : existing.due_date;
      db.prepare(
        'UPDATE tasks SET title=?, status=?, priority=?, category=?, due_date=?, updated_at=? WHERE id=? AND user_id=?'
      ).run(
        args.title ?? existing.title,
        args.status ?? existing.status,
        args.priority ?? existing.priority,
        args.category ?? existing.category,
        dueDate,
        now, args.task_id, userId
      );
      const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.task_id);
      const becameDone = row.status === 'done' && existing.status !== 'done';
      if (becameDone) taskSync.deleteTaskEvent(userId, row.id);
      else taskSync.syncTask(userId, row);
      return { success: true, message: `Updated task "${row.title}"`, data: taskToClient(row) };
    },
  },

  complete_task: {
    description: 'Mark a task as done. Shortcut for update_task with status=done.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
    execute: (userId, args) => {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(args.task_id, userId);
      if (!existing) return { success: false, message: `Task ${args.task_id} not found` };
      const now = new Date().toISOString();
      db.prepare('UPDATE tasks SET status=?, updated_at=?, last_completed_at=? WHERE id=? AND user_id=?')
        .run('done', now, now, args.task_id, userId);
      taskSync.deleteTaskEvent(userId, args.task_id);
      return { success: true, message: `Completed "${existing.title}"`, data: { id: args.task_id } };
    },
  },

  delete_task: {
    description: 'Permanently delete a task. Prefer complete_task unless the user explicitly wants it gone.',
    risk: 'high',
    parameters: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
    execute: (userId, args) => {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(args.task_id, userId);
      if (!existing) return { success: false, message: `Task ${args.task_id} not found` };
      db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(args.task_id, userId);
      taskSync.deleteTaskEvent(userId, args.task_id);
      return { success: true, message: `Deleted "${existing.title}"`, data: { id: args.task_id } };
    },
  },

  list_tasks: {
    description: 'List the user\'s tasks. Filter by status, priority, category, search term, or due_date range. Returns up to 30 results.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'open'], description: 'open = todo + in_progress' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        category: { type: 'string' },
        search: { type: 'string', description: 'Search in title' },
        due_before: { type: 'string', description: 'YYYY-MM-DD' },
        due_after: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
    execute: (userId, args) => {
      let sql = 'SELECT * FROM tasks WHERE user_id = ?';
      const params = [userId];
      if (args.status === 'open') sql += " AND status IN ('todo','in_progress')";
      else if (args.status) { sql += ' AND status = ?'; params.push(args.status); }
      if (args.priority) { sql += ' AND priority = ?'; params.push(args.priority); }
      if (args.category) { sql += ' AND category = ?'; params.push(args.category); }
      if (args.search) { sql += ' AND title LIKE ?'; params.push(`%${args.search}%`); }
      if (args.due_before) { sql += ' AND due_date IS NOT NULL AND due_date <= ?'; params.push(args.due_before); }
      if (args.due_after) { sql += ' AND due_date IS NOT NULL AND due_date >= ?'; params.push(args.due_after); }
      sql += ' ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC LIMIT 30';
      const rows = db.prepare(sql).all(...params);
      return { success: true, message: `Found ${rows.length} task(s)`, data: rows.map(taskToClient) };
    },
  },

  // ══════════════════ NOTES ══════════════════

  create_note: {
    description: 'Create a new note. Use for anything the user wants to remember or write down that is NOT an action item.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['content'],
    },
    execute: (userId, args) => {
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO notes (id, user_id, title, content, tags, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, userId, args.title || 'Untitled', args.content, JSON.stringify(args.tags || []), 0, now, now);
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      return { success: true, message: `Created note "${row.title}"`, data: noteToClient(row) };
    },
  },

  update_note: {
    description: 'Modify an existing note by id.',
    risk: 'medium',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['note_id'],
    },
    execute: (userId, args) => {
      const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(args.note_id, userId);
      if (!existing) return { success: false, message: `Note ${args.note_id} not found` };
      const now = new Date().toISOString();
      db.prepare('UPDATE notes SET title=?, content=?, tags=?, updated_at=? WHERE id=? AND user_id=?').run(
        args.title ?? existing.title,
        args.content ?? existing.content,
        args.tags ? JSON.stringify(args.tags) : existing.tags,
        now, args.note_id, userId
      );
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(args.note_id);
      return { success: true, message: `Updated note "${row.title}"`, data: noteToClient(row) };
    },
  },

  delete_note: {
    description: 'Permanently delete a note.',
    risk: 'high',
    parameters: {
      type: 'object',
      properties: { note_id: { type: 'string' } },
      required: ['note_id'],
    },
    execute: (userId, args) => {
      const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(args.note_id, userId);
      if (!existing) return { success: false, message: `Note ${args.note_id} not found` };
      db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(args.note_id, userId);
      return { success: true, message: `Deleted note "${existing.title}"`, data: { id: args.note_id } };
    },
  },

  search_notes: {
    description: 'Search notes by title, content, or tag. Returns up to 20 results.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    execute: (userId, args) => {
      const q = `%${args.query}%`;
      const rows = db.prepare(
        'SELECT * FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?) ORDER BY updated_at DESC LIMIT 20'
      ).all(userId, q, q, q);
      return { success: true, message: `Found ${rows.length} note(s)`, data: rows.map(noteToClient) };
    },
  },

  // ══════════════════ FINANCE ══════════════════

  log_transaction: {
    description: 'Log an income or expense transaction. Category examples: food, transport, groceries, utilities, rent, entertainment, salary.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['income', 'expense'] },
        amount: { type: 'number', description: 'Positive number' },
        category: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['type', 'amount'],
    },
    execute: (userId, args) => {
      if (!args.amount || args.amount <= 0) return { success: false, message: 'Amount must be positive' };
      const id = genId();
      const date = normalizeDate(args.date) || todayISO();
      db.prepare(
        'INSERT INTO transactions (id, user_id, type, amount, description, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, userId, args.type, args.amount, args.description || '', args.category || 'other', date);
      return {
        success: true,
        message: `Logged ${args.type}: ${args.amount} ${args.category || 'other'}`,
        data: { id, type: args.type, amount: args.amount, category: args.category, date },
      };
    },
  },

  query_finance: {
    description: 'Get a summary of income, expenses, and top categories. Scope to a month (YYYY-MM) or leave blank for current month.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: { month: { type: 'string', description: 'YYYY-MM format' } },
    },
    execute: (userId, args) => {
      const month = args.month || new Date().toISOString().slice(0, 7);
      const income = db.prepare(
        "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id=? AND type='income' AND date LIKE ? || '%'"
      ).get(userId, month).total;
      const expense = db.prepare(
        "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id=? AND type='expense' AND date LIKE ? || '%'"
      ).get(userId, month).total;
      const byCategory = db.prepare(
        "SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM transactions WHERE user_id=? AND type='expense' AND date LIKE ? || '%' GROUP BY category ORDER BY total DESC LIMIT 8"
      ).all(userId, month);
      return {
        success: true,
        message: `${month}: income ${income}, expenses ${expense}`,
        data: { month, income, expense, net: income - expense, topCategories: byCategory },
      };
    },
  },

  // ══════════════════ HABITS ══════════════════

  create_habit: {
    description: 'Create a new daily habit to track.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        icon: { type: 'string', description: 'Single emoji' },
        color: { type: 'string', description: 'Hex color like #9333ea' },
      },
      required: ['label'],
    },
    execute: (userId, args) => {
      const id = genId();
      db.prepare('INSERT INTO habits (id, user_id, label, icon, color) VALUES (?, ?, ?, ?, ?)')
        .run(id, userId, args.label, args.icon || '', args.color || '#9333ea');
      return { success: true, message: `Created habit "${args.label}"`, data: { id, label: args.label } };
    },
  },

  toggle_habit: {
    description: 'Mark a habit done (or undo) for a specific date. Identify habit by id OR by name (case-insensitive).',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        habit_id: { type: 'string' },
        habit_name: { type: 'string', description: 'Alternative to habit_id — fuzzy match on label' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
    },
    execute: (userId, args) => {
      let habit = null;
      if (args.habit_id) {
        habit = db.prepare('SELECT * FROM habits WHERE id=? AND user_id=?').get(args.habit_id, userId);
      } else if (args.habit_name) {
        habit = db.prepare('SELECT * FROM habits WHERE user_id=? AND LOWER(label) LIKE ? LIMIT 1')
          .get(userId, `%${args.habit_name.toLowerCase()}%`);
      }
      if (!habit) return { success: false, message: 'Habit not found. Try list_habits first.' };
      const date = normalizeDate(args.date) || todayISO();
      const existing = db.prepare('SELECT id FROM habit_completions WHERE habit_id=? AND completed_date=?').get(habit.id, date);
      if (existing) {
        db.prepare('DELETE FROM habit_completions WHERE id=?').run(existing.id);
        return { success: true, message: `Unchecked "${habit.label}" for ${date}`, data: { habitId: habit.id, date, checked: false } };
      }
      db.prepare('INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES (?, ?, ?)').run(habit.id, userId, date);
      return { success: true, message: `Checked "${habit.label}" for ${date}`, data: { habitId: habit.id, date, checked: true } };
    },
  },

  list_habits: {
    description: 'List all tracked habits with current streak info.',
    risk: 'read',
    parameters: { type: 'object', properties: {} },
    execute: (userId) => {
      const habits = db.prepare('SELECT * FROM habits WHERE user_id=? ORDER BY created_at ASC').all(userId);
      const today = todayISO();
      const enriched = habits.map(h => {
        const dates = db.prepare('SELECT completed_date FROM habit_completions WHERE habit_id=? ORDER BY completed_date DESC').all(h.id).map(r => r.completed_date);
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
          const ds = d.toISOString().split('T')[0];
          if (dates.includes(ds)) streak++;
          else if (i > 0) break;
          d.setDate(d.getDate() - 1);
        }
        return { id: h.id, label: h.label, streak, doneToday: dates.includes(today) };
      });
      return { success: true, message: `${enriched.length} habit(s)`, data: enriched };
    },
  },

  // ══════════════════ WELLNESS ══════════════════

  log_water: {
    description: 'Log water intake (in ml).',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: { amount_ml: { type: 'number', description: 'e.g. 250 for a glass' } },
      required: ['amount_ml'],
    },
    execute: (userId, args) => {
      const id = genId();
      const date = todayISO();
      db.prepare('INSERT INTO water_logs (id, user_id, date, amount_ml) VALUES (?, ?, ?, ?)').run(id, userId, date, args.amount_ml);
      const total = db.prepare("SELECT COALESCE(SUM(amount_ml),0) AS t FROM water_logs WHERE user_id=? AND date=?").get(userId, date).t;
      return { success: true, message: `Logged ${args.amount_ml}ml. Today: ${total}ml`, data: { amount_ml: args.amount_ml, total } };
    },
  },

  log_sleep: {
    description: 'Log sleep for a night. Duration or bedtime+wake_time both accepted.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD (the morning you woke up)' },
        duration_minutes: { type: 'number' },
        quality: { type: 'number', description: '1-5 scale' },
        bedtime: { type: 'string', description: 'HH:MM' },
        wake_time: { type: 'string', description: 'HH:MM' },
      },
    },
    execute: (userId, args) => {
      const date = normalizeDate(args.date) || todayISO();
      let duration = args.duration_minutes;
      if (!duration && args.bedtime && args.wake_time) {
        const [bh, bm] = args.bedtime.split(':').map(Number);
        const [wh, wm] = args.wake_time.split(':').map(Number);
        duration = ((wh * 60 + wm) - (bh * 60 + bm) + 1440) % 1440;
      }
      const id = genId();
      db.prepare(
        'INSERT INTO sleep_logs (id, user_id, date, bedtime, wake_time, duration_minutes, quality) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET duration_minutes=excluded.duration_minutes, quality=excluded.quality, bedtime=excluded.bedtime, wake_time=excluded.wake_time'
      ).run(id, userId, date, args.bedtime || null, args.wake_time || null, duration || null, args.quality || null);
      return {
        success: true,
        message: `Logged ${duration ? `${(duration / 60).toFixed(1)}h` : 'sleep'} for ${date}`,
        data: { date, duration_minutes: duration, quality: args.quality },
      };
    },
  },

  log_journal: {
    description: 'Add a journal entry with an optional mood emoji.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        mood: { type: 'string', description: 'Single emoji: 😊 😄 😐 😫 😡 etc.' },
      },
      required: ['text'],
    },
    execute: (userId, args) => {
      const id = genId();
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().slice(0, 5);
      db.prepare('INSERT INTO journal_entries (id, user_id, text, mood, date, time) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, userId, args.text, args.mood || '😊', date, time);
      return { success: true, message: `Journaled (${args.mood || '😊'})`, data: { id, date, time } };
    },
  },

  // ══════════════════ GOALS ══════════════════

  create_goal: {
    description: 'Create a long-term goal with optional target date.',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', description: 'e.g. career, health, financial, learning' },
        target_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['title'],
    },
    execute: (userId, args) => {
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO goals (id, user_id, title, description, category, target_date, status, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, userId, args.title, args.description || '', args.category || 'personal', normalizeDate(args.target_date), 'active', 0, now, now);
      return { success: true, message: `Created goal "${args.title}"`, data: { id, title: args.title } };
    },
  },

  // ══════════════════ INSIGHTS ══════════════════

  get_dashboard_snapshot: {
    description: 'Get a structured snapshot of everything relevant today: open tasks, due-today, habit completions, sleep, water, recent transactions. Call this BEFORE making suggestions or edits if you lack context.',
    risk: 'read',
    parameters: { type: 'object', properties: {} },
    execute: (userId) => {
      const today = todayISO();
      const openTasks = db.prepare("SELECT * FROM tasks WHERE user_id=? AND status IN ('todo','in_progress') ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_date ASC LIMIT 15").all(userId);
      const dueToday = openTasks.filter(t => t.due_date === today);
      const overdue = openTasks.filter(t => t.due_date && t.due_date < today);
      const habits = db.prepare('SELECT id, label FROM habits WHERE user_id=?').all(userId);
      const doneToday = db.prepare('SELECT habit_id FROM habit_completions WHERE user_id=? AND completed_date=?').all(userId, today).map(r => r.habit_id);
      const habitStatus = habits.map(h => ({ id: h.id, label: h.label, doneToday: doneToday.includes(h.id) }));
      const sleep = db.prepare('SELECT duration_minutes, quality FROM sleep_logs WHERE user_id=? AND date=?').get(userId, today);
      const water = db.prepare("SELECT COALESCE(SUM(amount_ml),0) AS t FROM water_logs WHERE user_id=? AND date=?").get(userId, today).t;
      const goalCount = db.prepare("SELECT COUNT(*) AS c FROM goals WHERE user_id=? AND status='active'").get(userId).c;
      const monthKey = today.slice(0, 7);
      const monthExpense = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM transactions WHERE user_id=? AND type='expense' AND date LIKE ? || '%'").get(userId, monthKey).t;
      return {
        success: true,
        message: 'Current state snapshot',
        data: {
          today,
          tasks: {
            openCount: openTasks.length,
            dueToday: dueToday.map(taskToClient),
            overdue: overdue.map(taskToClient),
            top: openTasks.slice(0, 6).map(taskToClient),
          },
          habits: habitStatus,
          sleep: sleep || null,
          water_ml_today: water,
          active_goals: goalCount,
          this_month_expense: monthExpense,
        },
      };
    },
  },
};

function normalizeDate(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (!s || s === 'null' || s === 'none') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const now = new Date();
  if (s === 'today') return now.toISOString().split('T')[0];
  if (s === 'tomorrow') { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
  if (s === 'yesterday') { const d = new Date(now); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }
  const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  if (s in days) {
    const target = days[s];
    const d = new Date(now);
    const delta = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

// ─── Schema builders ───
function buildOpenAISchemas() {
  return Object.entries(TOOLS).map(([name, tool]) => ({
    type: 'function',
    function: {
      name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function buildGeminiSchemas() {
  // Gemini function-declarations use slightly different format
  return [{
    functionDeclarations: Object.entries(TOOLS).map(([name, tool]) => ({
      name,
      description: tool.description,
      parameters: sanitizeGeminiSchema(tool.parameters),
    })),
  }];
}

function sanitizeGeminiSchema(schema) {
  // Gemini doesn't support default, strip it
  if (!schema || typeof schema !== 'object') return schema;
  const { default: _def, ...rest } = schema;
  const out = { ...rest };
  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([k, v]) => [k, sanitizeGeminiSchema(v)])
    );
  }
  return out;
}

function executeTool(userId, name, args) {
  const tool = TOOLS[name];
  if (!tool) return { success: false, message: `Unknown tool: ${name}` };
  try {
    return tool.execute(userId, args || {});
  } catch (err) {
    return { success: false, message: `Tool error: ${err.message}` };
  }
}

function getRiskLevel(name) {
  return TOOLS[name]?.risk || 'read';
}

module.exports = {
  TOOLS,
  buildOpenAISchemas,
  buildGeminiSchemas,
  executeTool,
  getRiskLevel,
  normalizeDate,
};
