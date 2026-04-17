import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Heart, PenLine, RefreshCw, Dumbbell, UtensilsCrossed, Moon,
  Flame, Plus, Trash2, Sparkles, Droplets, BookOpen, Star,
} from 'lucide-react';
import { JournalTab, HabitsTab, WorkoutTab, MealTab, EmptyState } from './Dashboard';
import { useJournal } from '../context/JournalContext';
import { useHabits } from '../context/HabitsContext';
import { useWorkouts } from '../context/WorkoutContext';
import { useMeals } from '../context/MealContext';
import { useSleep } from '../context/SleepContext';
import { useWater } from '../context/WaterContext';
import { useBooks } from '../context/BooksContext';

const SUBTABS = [
  { id: 'journal', label: 'Journal', icon: PenLine, accent: 'from-purple-500 to-violet-500' },
  { id: 'habits',  label: 'Habits',  icon: RefreshCw, accent: 'from-violet-500 to-fuchsia-500' },
  { id: 'workout', label: 'Workout', icon: Dumbbell,  accent: 'from-fuchsia-500 to-pink-500' },
  { id: 'meals',   label: 'Meals',   icon: UtensilsCrossed, accent: 'from-pink-500 to-rose-500' },
  { id: 'sleep',   label: 'Sleep',   icon: Moon, accent: 'from-indigo-500 to-purple-500' },
  { id: 'water',   label: 'Water',   icon: Droplets, accent: 'from-cyan-500 to-blue-500' },
  { id: 'books',   label: 'Books',   icon: BookOpen, accent: 'from-amber-500 to-orange-500' },
];

/* ── Reveal wrapper: fade + rise on scroll ── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value, tone }) {
  const tones = {
    purple: 'from-purple-500/20 to-violet-500/5 text-purple-300 ring-purple-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-300 ring-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-300 ring-amber-500/20',
    sky: 'from-sky-500/20 to-blue-500/5 text-sky-300 ring-sky-500/20',
    rose: 'from-rose-500/20 to-pink-500/5 text-rose-300 ring-rose-500/20',
  };
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${tones[tone]} ring-1 px-4 py-3 backdrop-blur-xl`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{label}</div>
        <div className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">{value}</div>
      </div>
    </motion.div>
  );
}

function formatDuration(min) {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function todayKey() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function SleepTab() {
  const { logs, saveLog, deleteLog } = useSleep();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(4);
  const [notes, setNotes] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    await saveLog({ date, bedtime, wakeTime, quality, notes: notes.trim() || null });
    setNotes('');
    setShowForm(false);
  };

  if (logs.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={Moon}
        title="No sleep logged"
        subtitle="Track your bedtime, wake time and quality to spot patterns"
        action="Log Sleep"
        onAction={() => setShowForm(true)}
      />
    );
  }

  const avgMin = logs.length
    ? Math.round(logs.reduce((s, l) => s + (l.duration_minutes || 0), 0) / logs.length)
    : 0;
  const avgQuality = logs.length
    ? (logs.reduce((s, l) => s + (l.quality || 0), 0) / logs.length).toFixed(1)
    : '—';

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-4 mb-3 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Moon size={11} className="text-indigo-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">{logs.length} nights</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Sparkles size={11} className="text-purple-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">avg {formatDuration(avgMin)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Flame size={11} className="text-amber-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">quality {avgQuality}/5</span>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="space-y-3 rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.05] to-purple-500/[0.02] p-4"
          >
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs">
                <span className="block mb-1 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Date</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500/40" />
              </label>
              <label className="text-xs">
                <span className="block mb-1 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Bedtime</span>
                <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500/40" />
              </label>
              <label className="text-xs">
                <span className="block mb-1 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Wake</span>
                <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-indigo-500/40" />
              </label>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Quality</span>
                <span className="text-xs font-semibold text-indigo-300">{quality}/5</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <motion.button
                    key={n}
                    type="button"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuality(n)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                      quality >= n
                        ? 'bg-gradient-to-br from-indigo-500/30 to-purple-500/20 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'bg-white/[0.03] text-[var(--color-text-muted)]/60 hover:bg-white/[0.05]'
                    }`}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes (dreams, what kept you up, etc)…"
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none focus:border-indigo-500/40"
            />
            <div className="flex justify-end gap-2">
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)]">
                Cancel
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20">
                Save Night
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {logs.map((log, i) => (
          <motion.div
            key={log.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ x: 2, backgroundColor: 'rgba(99,102,241,0.04)' }}
            className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-indigo-500/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-300">
              <Moon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatDuration(log.duration_minutes)}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {log.bedtime || '—'} → {log.wake_time || '—'}
                </span>
              </div>
              {log.notes && (
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] truncate">{log.notes}</p>
              )}
            </div>
            <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">{log.date}</span>
            {log.quality ? (
              <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">{log.quality}/5</span>
            ) : null}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}
              onClick={() => deleteLog(log.id)}
              className="rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 text-[var(--color-text-muted)]">
              <Trash2 size={12} />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {!showForm && (
        <motion.button whileHover={{ scale: 1.01, backgroundColor: 'rgba(99,102,241,0.05)' }} whileTap={{ scale: 0.99 }}
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-xs font-medium text-[var(--color-text-muted)] transition-all hover:border-indigo-500/20 hover:text-indigo-300">
          <Plus size={13} /> Log sleep
        </motion.button>
      )}
    </div>
  );
}

/* ── Water Tracking Tab ── */
const QUICK_AMOUNTS = [
  { label: '1 Glass', ml: 250, icon: '🥛' },
  { label: '1 Bottle', ml: 500, icon: '🍶' },
  { label: 'Sip', ml: 100, icon: '💧' },
  { label: 'Large Bottle', ml: 750, icon: '🫗' },
];

function WaterTab() {
  const { data, summary, fetchDay, addWater, deleteWater, fetchSummary } = useWater();
  const today = todayKey();

  useEffect(() => {
    fetchDay(today);
    fetchSummary(7);
  }, [today, fetchDay, fetchSummary]);

  const progressPct = data.progress || 0;
  const ringColor = progressPct >= 100 ? '#22c55e' : progressPct >= 60 ? '#06b6d4' : '#3b82f6';

  return (
    <div className="p-4 space-y-4">
      {/* Progress ring + stats */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round"
              initial={{ strokeDasharray: '0 327' }}
              animate={{ strokeDasharray: `${(progressPct / 100) * 327} 327` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets size={16} className="text-cyan-400 mb-0.5" />
            <span className="text-lg font-bold text-[var(--color-text-primary)]">{progressPct}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-sm text-[var(--color-text-secondary)]">
            <span className="text-xl font-bold text-[var(--color-text-primary)]">{data.total || 0}</span>
            <span className="text-[var(--color-text-muted)]"> / {data.goal} ml</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {data.goal - (data.total || 0) > 0
              ? `${data.goal - data.total} ml remaining today`
              : 'Daily goal reached!'}
          </div>
          {/* Mini weekly chart */}
          {summary.length > 0 && (
            <div className="flex items-end gap-1 h-10 mt-2">
              {summary.map((day, i) => {
                const pct = data.goal > 0 ? Math.min((day.total / data.goal) * 100, 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct * 0.4, 2)}px` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="w-full rounded-full"
                      style={{ background: pct >= 100 ? '#22c55e' : '#06b6d4', minHeight: 2, maxHeight: 40 }}
                    />
                    <span className="text-[8px] text-[var(--color-text-muted)]">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick add buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map(qa => (
          <motion.button
            key={qa.label}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => addWater(qa.ml, today)}
            className="flex flex-col items-center gap-1 rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.05] to-blue-500/[0.02] p-3 text-center transition-all hover:border-cyan-500/30"
          >
            <span className="text-lg">{qa.icon}</span>
            <span className="text-[10px] font-semibold text-cyan-300">{qa.ml} ml</span>
            <span className="text-[9px] text-[var(--color-text-muted)]">{qa.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Today's log */}
      {(data.logs || []).length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] px-1">Today's log</span>
          {data.logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cyan-500/[0.03] transition-all"
            >
              <Droplets size={12} className="text-cyan-400" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{log.amount_ml} ml</span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                {new Date(log.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}
                onClick={() => deleteWater(log.id, today)}
                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-[var(--color-text-muted)] transition-all"
              >
                <Trash2 size={11} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Books / Reading Tab ── */
function BooksTab() {
  const { books, reading, toRead, finished, addBook, updateBook, deleteBook } = useBooks();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [filter, setFilter] = useState('all');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addBook({ title: title.trim(), author: author.trim() || null, totalPages: totalPages ? Number(totalPages) : null, status: 'to_read' });
    setTitle(''); setAuthor(''); setTotalPages('');
    setShowForm(false);
  };

  const statusColors = {
    to_read: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
    reading: 'bg-blue-500/15 text-blue-300 ring-blue-500/20',
    finished: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  };
  const statusLabels = { to_read: 'To Read', reading: 'Reading', finished: 'Finished' };

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter);

  if (books.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No books yet"
        subtitle="Track your reading — add books you're reading or want to read"
        action="Add Book"
        onAction={() => setShowForm(true)}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <BookOpen size={11} className="text-blue-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">{reading.length} reading</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <BookOpen size={11} className="text-amber-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">{toRead.length} to read</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Star size={11} className="text-emerald-300" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">{finished.length} finished</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 px-1">
        {['all', 'reading', 'to_read', 'finished'].map(f => (
          <motion.button
            key={f}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              filter === f
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 ring-1 ring-amber-500/20'
                : 'text-[var(--color-text-muted)] hover:bg-white/5'
            }`}
          >
            {f === 'all' ? 'All' : statusLabels[f]}
          </motion.button>
        ))}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="space-y-3 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.05] to-orange-500/[0.02] p-4"
          >
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title..." autoFocus
              className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none border-b border-[var(--color-border)] py-1.5 focus:border-amber-500/50 transition-colors" />
            <div className="grid grid-cols-2 gap-2">
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author"
                className="w-full bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none border-b border-[var(--color-border)] py-1.5 focus:border-amber-500/50 transition-colors" />
              <input type="number" value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="Total pages"
                className="w-full bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none border-b border-[var(--color-border)] py-1.5 focus:border-amber-500/50 transition-colors" />
            </div>
            <div className="flex justify-end gap-2">
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-white/5">Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-500/20">Add Book</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Book list */}
      <AnimatePresence mode="popLayout">
        {filtered.map((book, i) => {
          const progress = book.total_pages && book.current_page ? Math.round((book.current_page / book.total_pages) * 100) : 0;
          return (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ x: 2, backgroundColor: 'rgba(245,158,11,0.03)' }}
              className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-amber-500/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-300">
                <BookOpen size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{book.title}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${statusColors[book.status]}`}>
                    {statusLabels[book.status]}
                  </span>
                </div>
                {book.author && <p className="text-[11px] text-[var(--color-text-muted)] truncate">by {book.author}</p>}
                {book.status === 'reading' && book.total_pages > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                    <span className="text-[9px] text-[var(--color-text-muted)]">{book.current_page || 0}/{book.total_pages}p</span>
                  </div>
                )}
              </div>
              {/* Quick actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {book.status === 'to_read' && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateBook(book.id, { status: 'reading' })}
                    className="rounded-lg px-2 py-1 text-[9px] font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-all">
                    Start
                  </motion.button>
                )}
                {book.status === 'reading' && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateBook(book.id, { status: 'finished' })}
                    className="rounded-lg px-2 py-1 text-[9px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
                    Finish
                  </motion.button>
                )}
                {book.rating ? (
                  <span className="text-[10px] text-amber-300">{book.rating}/5 ★</span>
                ) : book.status === 'finished' ? (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <motion.button key={n} whileTap={{ scale: 0.8 }} onClick={() => updateBook(book.id, { rating: n })}
                        className="text-[var(--color-text-muted)]/30 hover:text-amber-400 transition-colors">
                        <Star size={10} />
                      </motion.button>
                    ))}
                  </div>
                ) : null}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}
                  onClick={() => deleteBook(book.id)}
                  className="rounded-lg p-1.5 hover:bg-red-500/10 hover:text-red-400 text-[var(--color-text-muted)] transition-all">
                  <Trash2 size={12} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {!showForm && (
        <motion.button whileHover={{ scale: 1.01, backgroundColor: 'rgba(245,158,11,0.05)' }} whileTap={{ scale: 0.99 }}
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-xs font-medium text-[var(--color-text-muted)] transition-all hover:border-amber-500/20 hover:text-amber-300">
          <Plus size={13} /> Add book
        </motion.button>
      )}
    </div>
  );
}

export default function WellnessPage() {
  const [active, setActive] = useState('journal');
  const { entries } = useJournal();
  const { habits } = useHabits();
  const { workouts } = useWorkouts();
  const { meals } = useMeals();
  const { logs: sleepLogs } = useSleep();
  const { data: waterData } = useWater();
  const { books } = useBooks();

  const stats = useMemo(() => {
    const today = todayKey();
    const habitsToday = habits.filter(h => (h.completedDays || []).includes(today)).length;
    const workoutsDone = workouts.filter(w => w.done).length;
    const mealsEaten = meals.filter(m => m.eaten).length;
    const lastSleep = sleepLogs[0];
    return {
      journal: entries.length,
      habits: `${habitsToday}/${habits.length}`,
      workouts: workoutsDone,
      meals: mealsEaten,
      sleep: lastSleep ? formatDuration(lastSleep.duration_minutes) : '—',
      water: `${waterData.progress || 0}%`,
      books: books.filter(b => b.status === 'reading').length,
    };
  }, [entries, habits, workouts, meals, sleepLogs, waterData, books]);

  const activeTab = SUBTABS.find(t => t.id === active) || SUBTABS[0];
  const TabIcon = activeTab.icon;

  const renderTab = () => {
    switch (active) {
      case 'journal': return <JournalTab />;
      case 'habits':  return <HabitsTab />;
      case 'workout': return <WorkoutTab />;
      case 'meals':   return <MealTab />;
      case 'sleep':   return <SleepTab />;
      case 'water':   return <WaterTab />;
      case 'books':   return <BooksTab />;
      default:        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] glass-card p-7 magnetic-card">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/25 to-fuchsia-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/5 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-xl shadow-purple-500/30"
            >
              <Heart size={24} className="text-white" />
            </motion.div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Wellness</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Mind, body, rhythm — all in one place.
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <StatPill icon={PenLine} tone="purple" label="Entries" value={stats.journal} />
            <StatPill icon={RefreshCw} tone="emerald" label="Habits today" value={stats.habits} />
            <StatPill icon={Dumbbell} tone="amber" label="Workouts done" value={stats.workouts} />
            <StatPill icon={UtensilsCrossed} tone="rose" label="Meals eaten" value={stats.meals} />
            <StatPill icon={Moon} tone="sky" label="Last sleep" value={stats.sleep} />
            <StatPill icon={Droplets} tone="sky" label="Water today" value={stats.water} />
            <StatPill icon={BookOpen} tone="amber" label="Reading" value={stats.books} />
          </div>
        </div>
      </Reveal>

      {/* Sub-tab segmented control */}
      <Reveal delay={0.08}>
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--color-border)] glass-card p-1.5">
          {SUBTABS.map(tab => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="wellnessActive"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className={`absolute inset-0 -z-0 rounded-xl bg-gradient-to-r ${tab.accent} shadow-lg shadow-purple-500/20`}
                  />
                )}
                <Icon size={14} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </Reveal>

      {/* Active tab panel */}
      <Reveal delay={0.12}>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] glass-card">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${activeTab.accent} text-white`}>
              <TabIcon size={13} />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{activeTab.label}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </div>
  );
}
