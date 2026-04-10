import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NotesContext';
import { useTimer } from '../context/TimerContext';
import { useFocus } from '../context/FocusContext';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, OVERVIEW_TABS, PRIORITY_COLORS, TASK_STATES, QUOTES } from '../utils/constants';
import { formatRupees, formatTime } from '../utils/helpers';
import {
  Play, Pause, RotateCcw,
  CheckSquare, Crosshair,
  Check, Trash2, Plus, Sparkles, ListTodo,
  CalendarDays, Target, BookOpen,
  PenLine, Dumbbell, UtensilsCrossed, RefreshCw,
  Clock, ImageIcon, StickyNote, Pin, Pencil, X, Repeat2, AlertCircle,
  Wallet, TrendingUp, TrendingDown
} from 'lucide-react';

/* ── animation variants ── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};


/* ── Floating Particles (decorative, pre-computed to avoid re-randomizing) ── */
const HERO_PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  size: 4 + (((i * 7 + 3) % 9) / 9) * 6,
  opacity: 0.15 + (((i * 11 + 2) % 9) / 9) * 0.2,
  left: 10 + ((i * 17 + 5) % 80),
  top: 10 + ((i * 23 + 11) % 80),
  yMid: -20 - (((i * 13 + 7) % 9) / 9) * 30,
  xMid: ((i * 19 + 2) % 9) / 9 * 20 - 10,
  duration: 4 + (((i * 11 + 1) % 9) / 9) * 4,
  delay: (((i * 29 + 3) % 9) / 9) * 3,
}));

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {HERO_PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: `rgba(147, 51, 234, ${p.opacity})`,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{
            y: [0, p.yMid, 0],
            x: [0, p.xMid, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ── Theme image sets ── */
const THEME_SETS = [
  {
    id: 'neon',
    label: '🌆 Neon',
    hero: '/images/hero-banner.png',
    cards: { daily: '/images/daily.png', planners: '/images/planners.png', personal: '/images/personal.png', goals: '/images/goals.png' },
  },
  {
    id: 'zen',
    label: '🏯 Zen',
    hero: '/images/themes/zen/hero-banner.png',
    cards: { daily: '/images/themes/zen/daily.png', planners: '/images/themes/zen/planners.png', personal: '/images/themes/zen/personal.png', goals: '/images/themes/zen/goals.png' },
  },
  {
    id: 'ocean',
    label: '🌊 Ocean',
    hero: '/images/themes/ocean/hero-banner.png',
    cards: { daily: '/images/themes/ocean/daily.png', planners: '/images/themes/ocean/planners.png', personal: '/images/themes/ocean/personal.png', goals: '/images/themes/ocean/goals.png' },
  },
  {
    id: 'aurora',
    label: '🌌 Aurora',
    hero: '/images/themes/aurora/hero-banner.svg',
    cards: { daily: '/images/themes/aurora/daily.svg', planners: '/images/themes/aurora/planners.svg', personal: '/images/themes/aurora/personal.svg', goals: '/images/themes/aurora/goals.svg' },
  },
  {
    id: 'sakura',
    label: '🌸 Sakura',
    hero: '/images/themes/sakura/hero-banner.svg',
    cards: { daily: '/images/themes/sakura/daily.svg', planners: '/images/themes/sakura/planners.svg', personal: '/images/themes/sakura/personal.svg', goals: '/images/themes/sakura/goals.svg' },
  },
];

/* ── Live Clock ── */
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const period = time.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 mt-4 mb-2"
    >
      <div className="flex items-center gap-0.5 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)]">
        <Clock size={14} className="text-purple-400 mr-2" />
        <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-wider font-mono">
          {hours}
        </span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="text-2xl font-bold text-purple-400 mx-0.5"
        >
          :
        </motion.span>
        <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-wider font-mono">
          {minutes}
        </span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="text-2xl font-bold text-purple-400 mx-0.5"
        >
          :
        </motion.span>
        <span className="text-lg font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
          {seconds}
        </span>
        <span className="text-xs font-semibold text-purple-400 ml-2 self-end mb-0.5">
          {period}
        </span>
      </div>
    </motion.div>
  );
}

function formatNoteDate(dateStr) {
  if (!dateStr) return 'Recently';

  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getNoteSummary(content) {
  if (!content?.trim()) return 'Empty note';
  const words = content.trim().split(/\s+/);
  return words.length > 22 ? `${words.slice(0, 22).join(' ')}...` : content.trim();
}

function formatTaskDateForInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function formatTaskDateDisplay(value) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(...value.split('-').map((part, index) => index === 1 ? Number(part) - 1 : Number(part)))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDueState(dueDate) {
  if (!dueDate) return { label: 'No date', tone: 'muted', days: null };
  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? new Date(...dueDate.split('-').map((part, index) => index === 1 ? Number(part) - 1 : Number(part)))
    : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { label: dueDate, tone: 'muted', days: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger', days };
  if (days === 0) return { label: 'Due today', tone: 'warning', days };
  if (days === 1) return { label: 'Tomorrow', tone: 'accent', days };
  return { label: `${days}d left`, tone: days <= 7 ? 'accent' : 'muted', days };
}

function NotesFlashcards({ compact = false, className = '' }) {
  const { notes } = useNotes();
  const [expandedId, setExpandedId] = useState(null);
  const visibleNotes = notes.slice(0, 6);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`${compact ? '' : 'mb-8'} ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-5 h-0.5 bg-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: 20 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Notes</h2>
        </div>
        {notes.length > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {notes.length} saved {notes.length === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      {visibleNotes.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <StickyNote size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No notes yet</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Notes you create in the Notes tab will appear here.</p>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? '' : 'xl:grid-cols-3'} gap-4`}>
          <AnimatePresence mode="popLayout">
            {visibleNotes.map((note, i) => {
              const isExpanded = expandedId === note.id;
              const tags = note.tags || [];

              return (
                <motion.button
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 14, rotate: i % 2 === 0 ? -1 : 1 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -5, rotate: i % 2 === 0 ? -0.5 : 0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className={`group relative text-left rounded-xl border p-4 overflow-hidden transition-all ${isExpanded
                      ? 'md:col-span-2 xl:col-span-2 border-purple-500/30'
                      : 'border-[var(--color-border)] hover:border-purple-500/30'
                    }`}
                  style={{
                    background: note.color || 'linear-gradient(135deg, var(--color-surface-card), var(--color-surface-elevated))',
                    boxShadow: isExpanded
                      ? '0 18px 50px rgba(var(--accent-rgb), 0.12)'
                      : '0 10px 30px rgba(0,0,0,0.12)',
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 opacity-80"
                    style={{ background: 'linear-gradient(90deg, var(--accent-color), var(--accent-light))' }}
                  />
                  <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {note.pinned && <Pin size={12} className="text-purple-400 fill-purple-400 shrink-0" />}
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-semibold">
                            {formatNoteDate(note.updatedAt || note.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--color-text-primary)] line-clamp-2">
                          {note.title || 'Untitled'}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                        <StickyNote size={16} className="text-purple-400" />
                      </div>
                    </div>

                    <motion.p
                      layout
                      className={`text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'
                        }`}
                    >
                      {isExpanded ? (note.content || 'Empty note') : getNoteSummary(note.content)}
                    </motion.p>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {tags.slice(0, isExpanded ? tags.length : 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {isExpanded ? 'Tap to collapse' : 'Tap to read'}
                      </span>
                      <span className="text-[11px] font-semibold text-purple-400">
                        {isExpanded ? 'Full note' : 'Flashcard'}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

function DueSoonTasks() {
  const { tasks, completeTask, updateTask } = useTasks();
  const upcoming = tasks
    .filter(task => task.status !== TASK_STATES.DONE && task.dueDate)
    .map(task => ({ ...task, dueState: getDueState(task.dueDate) }))
    .filter(task => task.dueState.days !== null && task.dueState.days <= 7)
    .sort((a, b) => a.dueState.days - b.dueState.days)
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  const toneClasses = {
    danger: 'text-red-400 bg-red-500/10 border-red-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    muted: 'text-[var(--color-text-muted)] bg-white/[0.03] border-[var(--color-border)]',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          className="w-5 h-0.5 bg-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 20 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Due Soon</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {upcoming.map((task, i) => {
          const priority = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3 }}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3.5"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${toneClasses[task.dueState.tone]}`}>
                  <AlertCircle size={11} />
                  {task.dueState.label}
                </span>
                {task.recurring && task.recurring !== 'none' && (
                  <Repeat2 size={13} className="text-purple-400" />
                )}
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 min-h-[40px]">
                {task.title}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                  {priority.label}
                </span>
                <button
                  onClick={() => task.recurring && task.recurring !== 'none'
                    ? completeTask(task.id)
                    : updateTask(task.id, { status: TASK_STATES.DONE })}
                  className="text-[11px] font-semibold text-purple-400 hover:text-[var(--accent-light)] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ── Hero Banner (with theme picker) ── */
function HeroBanner({ currentTheme, onSwitchTheme }) {
  const [showPicker, setShowPicker] = useState(false);
  const theme = THEME_SETS.find(t => t.id === currentTheme) || THEME_SETS[0];

  const switchTheme = (id) => {
    onSwitchTheme(id);
    setShowPicker(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full h-52 rounded-2xl overflow-hidden mb-8"
    >
      <img
        src={theme.hero}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-dark)] via-transparent to-transparent opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-950/40 to-transparent" />
      <FloatingParticles />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, #9333ea, #d946ef, #7c3aed, #9333ea)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
        className="absolute bottom-[-20px] left-8 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 border-4 border-[var(--color-surface-dark)] flex items-center justify-center"
      >
        <Sparkles size={20} className="text-white" />
      </motion.div>

      {/* Theme Picker Toggle */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowPicker(!showPicker)}
        className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10"
        title="Change theme images"
      >
        <ImageIcon size={16} />
      </motion.button>

      {/* Theme Picker Dropdown */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 right-3 rounded-xl bg-[rgba(16,16,16,0.95)] backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] p-2 shadow-2xl z-20 min-w-[180px]"
            style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)' }}
          >
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-3 pt-1 pb-2">Image Theme</p>
            {THEME_SETS.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                onClick={() => switchTheme(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${currentTheme === t.id ? 'text-purple-400 bg-purple-500/10' : 'text-white/70 hover:text-white'
                  }`}
              >
                <div className="w-6 h-6 rounded-md overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={t.hero} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="font-medium">{t.label}</span>
                {currentTheme === t.id && <Check size={13} className="ml-auto text-purple-400" />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Category Cards (infinite horizontal carousel) ── */
function CategoryCards({ currentTheme }) {
  const theme = THEME_SETS.find(t => t.id === currentTheme) || THEME_SETS[0];
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const animRef = useRef(null);
  const speedRef = useRef(0.6);

  // Duplicate items for seamless loop
  const items = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

  // Reset scroll to middle set when it drifts too far
  const resetIfNeeded = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 3;
    if (el.scrollLeft >= oneSetWidth * 2) {
      el.scrollLeft -= oneSetWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += oneSetWidth;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Start in the middle set
    el.scrollLeft = el.scrollWidth / 3;

    const tick = () => {
      if (!isPaused && el) {
        el.scrollLeft += speedRef.current;
        resetIfNeeded();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPaused, resetIfNeeded]);

  return (
    <div
      className="relative mb-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-3 w-16 bg-gradient-to-r from-[var(--color-surface-dark)] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-3 w-16 bg-gradient-to-l from-[var(--color-surface-dark)] to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 no-scrollbar"
      >
        {items.map((cat, i) => (
          <motion.div
            key={`${cat.id}-${i}`}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: Math.min(i, CATEGORIES.length - 1) * 0.08 }}
            whileHover={{ y: -6, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group cursor-pointer flex-shrink-0"
            style={{ width: 'calc(25% - 12px)', minWidth: '220px' }}
          >
            <div className="relative h-28 rounded-xl overflow-hidden mb-3">
              <img
                src={theme.cards[cat.id]}
                alt={cat.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-500" />
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at center, rgba(147,51,234,0.15) 0%, transparent 70%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-bold tracking-wide drop-shadow-lg">
                  {cat.title}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="space-y-1.5 pl-1">
              {cat.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:translate-x-1.5 transition-all cursor-pointer"
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Empty State Component ── */
function EmptyState({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4"
      >
        <Icon size={28} className="text-purple-400" />
      </motion.div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4 text-center max-w-[240px]">{subtitle}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-purple-500 shadow-lg shadow-purple-500/20"
        >
          <Plus size={14} />
          {action}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ── Tab Content Components ── */

function JournalTab() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos-journal') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState('😊');

  const save = (data) => { localStorage.setItem('lifeos-journal', JSON.stringify(data)); };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const updated = [{ id: Date.now(), text: text.trim(), mood, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }, ...entries];
    setEntries(updated);
    save(updated);
    setText('');
    setShowForm(false);
  };

  const deleteEntry = (id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    save(updated);
  };

  if (entries.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={PenLine}
        title="No journal entries"
        subtitle="Write your first journal entry to reflect on your day"
        action="Write Entry"
        onAction={() => setShowForm(true)}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="p-3 rounded-xl bg-white/[0.03] border border-[var(--color-border)] space-y-3"
          >
            <div className="flex gap-2 mb-2">
              {['😊', '😐', '😔', '🔥', '😴', '🎉'].map(m => (
                <button key={m} type="button" onClick={() => setMood(m)}
                  className={`text-lg p-1 rounded-lg transition-all ${mood === m ? 'bg-purple-500/20 scale-110' : 'hover:bg-white/5'}`}>{m}</button>
              ))}
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="How was your day?" autoFocus rows={3}
              className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none resize-none border border-[var(--color-border)] rounded-lg px-3 py-2 focus:border-purple-500/50 transition-colors" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-purple-500 rounded-lg">Save</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence mode="popLayout">
        {entries.map((entry, i) => (
          <motion.div key={entry.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.03 }}
            className="p-3 rounded-lg hover:bg-white/[0.03] transition-colors group flex gap-3 items-start">
            <span className="text-lg shrink-0 mt-0.5">{entry.mood}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{entry.text}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{entry.date} · {entry.time}</p>
            </div>
            <button onClick={() => deleteEntry(entry.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-2 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
          <Plus size={12} /> Write entry
        </button>
      )}
    </div>
  );
}

function HabitsTab() {
  const [habits, setHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos-habits') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const todayKey = new Date().toISOString().split('T')[0];

  const save = (data) => { localStorage.setItem('lifeos-habits', JSON.stringify(data)); };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const updated = [...habits, { id: Date.now(), label: text.trim(), completedDays: [] }];
    setHabits(updated);
    save(updated);
    setText('');
    setShowForm(false);
  };

  const toggleDay = (id) => {
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const days = h.completedDays || [];
      return { ...h, completedDays: days.includes(todayKey) ? days.filter(d => d !== todayKey) : [...days, todayKey] };
    });
    setHabits(updated);
    save(updated);
  };

  const deleteHabit = (id) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    save(updated);
  };

  // Generate last 7 days for the streak view
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { key: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { weekday: 'narrow' }) };
  });

  if (habits.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No habits tracked"
        subtitle="Add habits you want to build and track your daily streaks"
        action="Add Habit"
        onAction={() => setShowForm(true)}
      />
    );
  }

  return (
    <div className="p-4 space-y-2">
      {/* Day headers */}
      <div className="flex items-center gap-2 mb-3 pl-[180px]">
        {last7.map(d => (
          <div key={d.key} className={`w-8 text-center text-[10px] font-medium ${d.key === todayKey ? 'text-purple-400' : 'text-[var(--color-text-muted)]'}`}>
            {d.label}
          </div>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {habits.map((habit, i) => (
          <motion.div key={habit.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 py-2 group">
            <span className="text-sm text-[var(--color-text-primary)] w-[170px] truncate">{habit.label}</span>
            <div className="flex gap-2">
              {last7.map(d => {
                const done = (habit.completedDays || []).includes(d.key);
                const isToday = d.key === todayKey;
                return (
                  <motion.button key={d.key} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                    onClick={isToday ? () => toggleDay(habit.id) : undefined}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${done ? 'bg-purple-500/20 text-purple-400' : isToday ? 'bg-white/5 text-[var(--color-text-muted)] hover:bg-purple-500/10 cursor-pointer' : 'bg-white/[0.02] text-[var(--color-text-muted)]/50'
                      } ${!isToday && !done ? 'cursor-default opacity-40' : ''}`}>
                    {done ? <Check size={14} /> : isToday ? '·' : ''}
                  </motion.button>
                );
              })}
            </div>
            <button onClick={() => deleteHabit(habit.id)}
              className="ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showForm ? (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} className="flex items-center gap-2 pt-2">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Habit name..." autoFocus
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none border-b border-[var(--color-border)] py-1 focus:border-purple-500/50 transition-colors" />
            <button type="submit" className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"><Check size={14} /></button>
          </motion.form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
            <Plus size={12} /> Add habit
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkoutTab() {
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos-workouts') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');

  const save = (data) => { localStorage.setItem('lifeos-workouts', JSON.stringify(data)); };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!exercise.trim()) return;
    const updated = [...logs, { id: Date.now(), exercise: exercise.trim(), sets: Number(sets), reps: Number(reps), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), done: false }];
    setLogs(updated);
    save(updated);
    setExercise(''); setSets('3'); setReps('10');
    setShowForm(false);
  };

  const toggleDone = (id) => {
    const updated = logs.map(l => l.id === id ? { ...l, done: !l.done } : l);
    setLogs(updated);
    save(updated);
  };

  const deleteLog = (id) => {
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    save(updated);
  };

  if (logs.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No workouts logged"
        subtitle="Log your exercises and track your training progress"
        action="Log Workout"
        onAction={() => setShowForm(true)}
      />
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
        <div className="col-span-1"></div>
        <div className="col-span-5">Exercise</div>
        <div className="col-span-2 text-center">Sets</div>
        <div className="col-span-2 text-center">Reps</div>
        <div className="col-span-2 text-right">Date</div>
      </div>
      <AnimatePresence mode="popLayout">
        {logs.map((log, i) => (
          <motion.div key={log.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-12 gap-2 px-2 py-2.5 items-center group hover:bg-white/[0.02] rounded-lg transition-colors">
            <div className="col-span-1">
              <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => toggleDone(log.id)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${log.done ? 'border-emerald-400 bg-emerald-400' : 'border-[var(--color-text-muted)] hover:border-emerald-400'}`}>
                {log.done && <Check size={10} className="text-white" />}
              </motion.button>
            </div>
            <div className="col-span-5">
              <span className={`text-sm ${log.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{log.exercise}</span>
            </div>
            <div className="col-span-2 text-center"><span className="text-sm text-purple-400 font-medium">{log.sets}</span></div>
            <div className="col-span-2 text-center"><span className="text-sm text-[var(--color-text-secondary)]">{log.reps}</span></div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">{log.date}</span>
              <button onClick={() => deleteLog(log.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
                <Trash2 size={11} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {showForm ? (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} className="grid grid-cols-12 gap-2 px-2 py-2 items-center bg-white/[0.02] rounded-lg">
            <div className="col-span-1" />
            <div className="col-span-5">
              <input value={exercise} onChange={e => setExercise(e.target.value)} placeholder="Exercise..." autoFocus
                className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none" />
            </div>
            <div className="col-span-2">
              <input value={sets} onChange={e => setSets(e.target.value)} type="number" min="1" max="99"
                className="w-full bg-transparent text-sm text-center text-[var(--color-text-primary)] outline-none" />
            </div>
            <div className="col-span-2">
              <input value={reps} onChange={e => setReps(e.target.value)} type="number" min="1" max="999"
                className="w-full bg-transparent text-sm text-center text-[var(--color-text-primary)] outline-none" />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"><Check size={14} /></button>
            </div>
          </motion.form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
            <Plus size={12} /> Log exercise
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}

function MealTab() {
  const [meals, setMeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeos-meals') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('🍳 Breakfast');

  const save = (data) => { localStorage.setItem('lifeos-meals', JSON.stringify(data)); };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    const updated = [...meals, { id: Date.now(), name: mealName.trim(), type: mealType, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), eaten: false }];
    setMeals(updated);
    save(updated);
    setMealName('');
    setShowForm(false);
  };

  const toggleEaten = (id) => {
    const updated = meals.map(m => m.id === id ? { ...m, eaten: !m.eaten } : m);
    setMeals(updated);
    save(updated);
  };

  const deleteMeal = (id) => {
    const updated = meals.filter(m => m.id !== id);
    setMeals(updated);
    save(updated);
  };

  const mealTypes = ['🍳 Breakfast', '🥗 Lunch', '🍽️ Dinner', '🍎 Snack'];

  if (meals.length === 0 && !showForm) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No meals planned"
        subtitle="Plan your meals to stay on track with your nutrition"
        action="Plan Meal"
        onAction={() => setShowForm(true)}
      />
    );
  }

  return (
    <div className="p-4 space-y-2">
      <AnimatePresence mode="popLayout">
        {meals.map((meal, i) => (
          <motion.div key={meal.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 py-2.5 px-2 group hover:bg-white/[0.02] rounded-lg transition-colors">
            <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => toggleEaten(meal.id)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${meal.eaten ? 'border-emerald-400 bg-emerald-400' : 'border-[var(--color-text-muted)] hover:border-emerald-400'}`}>
              {meal.eaten && <Check size={10} className="text-white" />}
            </motion.button>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-medium shrink-0">{meal.type}</span>
            <span className={`text-sm flex-1 ${meal.eaten ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{meal.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{meal.date}</span>
            <button onClick={() => deleteMeal(meal.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
              <Trash2 size={11} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {showForm ? (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} className="flex items-center gap-2 pt-2 px-2">
            <select value={mealType} onChange={e => setMealType(e.target.value)}
              className="bg-[var(--color-surface-dark)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none">
              {mealTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="What are you eating?" autoFocus
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none border-b border-[var(--color-border)] py-1 focus:border-purple-500/50 transition-colors" />
            <button type="submit" className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"><Check size={14} /></button>
          </motion.form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
            <Plus size={12} /> Plan meal
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Overview Table ── */
function OverviewTable({ onAddTaskRequest }) {
  const { tasks, updateTask, completeTask, deleteTask } = useTasks();
  const { enterFocus } = useFocus();
  const [activeTab, setActiveTab] = useState('todo');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editRecurring, setEditRecurring] = useState('none');

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title || '');
    setEditDueDate(formatTaskDateForInput(task.dueDate));
    setEditPriority(task.priority || 'medium');
    setEditRecurring(task.recurring || 'none');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditRecurring('none');
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editingTaskId || !editTitle.trim()) return;
    updateTask(editingTaskId, {
      title: editTitle.trim(),
      dueDate: editDueDate,
      priority: editPriority,
      recurring: editRecurring,
    });
    cancelEdit();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'journal': return <JournalTab />;
      case 'habits': return <HabitsTab />;
      case 'workout': return <WorkoutTab />;
      case 'meal': return <MealTab />;
      default: return renderTodoContent();
    }
  };

  const renderTodoContent = () => {
    if (tasks.length === 0) {
      return (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          subtitle="Add your first task to start organizing your workflow"
          action="Add Task"
          onAction={onAddTaskRequest}
        />
      );
    }

    return (
      <>
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          <div className="col-span-1 flex items-center">
            <CheckSquare size={13} />
          </div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-3">Due Date</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, i) => {
              const pColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
              const isDone = task.status === TASK_STATES.DONE;
              const isEditing = editingTaskId === task.id;
              const categoryColors = {
                Work: 'bg-purple-500/20 text-purple-400',
                Life: 'bg-blue-500/20 text-blue-400',
                Health: 'bg-emerald-500/20 text-emerald-400',
              };
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center group hover:bg-[var(--color-surface-hover)] transition-all duration-200"
                >
                  {isEditing ? (
                    <form onSubmit={saveEdit} className="contents">
                      <div className="col-span-1 flex items-center">
                        <Pencil size={13} className="text-purple-400" />
                      </div>
                      <div className="col-span-4">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full rounded-lg border border-purple-500/30 bg-[var(--color-surface-dark)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[task.category] || 'bg-gray-500/20 text-gray-400'}`}>
                          {task.category}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <div className="flex gap-1.5">
                          <input
                            value={editDueDate}
                            onChange={e => setEditDueDate(e.target.value)}
                            type="date"
                            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-dark)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                          />
                          <select
                            value={editRecurring}
                            onChange={e => setEditRecurring(e.target.value)}
                            className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-dark)] px-1 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                            title="Repeat"
                          >
                            <option value="none">Once</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <select
                          value={editPriority}
                          onChange={e => setEditPriority(e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-dark)] px-1.5 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                        >
                          <option value="high">High</option>
                          <option value="medium">Med</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end gap-1">
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} type="submit"
                          className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                          <Check size={13} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} type="button"
                          onClick={cancelEdit}
                          className="p-1 rounded bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10">
                          <X size={13} />
                        </motion.button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="col-span-1">
                        <motion.button
                          whileHover={{ scale: 1.3, rotate: 10 }}
                          whileTap={{ scale: 0.7 }}
                          onClick={() => {
                            if (isDone) updateTask(task.id, { status: TASK_STATES.TODO });
                            else if (task.recurring && task.recurring !== 'none') completeTask(task.id);
                            else updateTask(task.id, { status: TASK_STATES.DONE });
                          }}
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${isDone
                              ? 'border-purple-500 bg-purple-500 shadow-sm shadow-purple-500/30'
                              : 'border-[var(--color-text-muted)] hover:border-purple-400'
                            }`}
                        >
                          <AnimatePresence>
                            {isDone && (
                              <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                                <Check size={10} className="text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                      <div className="col-span-4">
                        <span className={`text-sm transition-all duration-300 ${isDone ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[task.category] || 'bg-gray-500/20 text-gray-400'}`}>
                          {task.category}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm text-[var(--color-text-secondary)]">{formatTaskDateDisplay(task.dueDate)}</span>
                        {task.recurring && task.recurring !== 'none' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-purple-400">
                            <Repeat2 size={10} />
                            {task.recurring}
                          </span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${pColor.bg} ${pColor.text}`}>
                          {pColor.label}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                          onClick={() => startEdit(task)}
                          className="p-1 rounded hover:bg-purple-500/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
                          <Pencil size={13} />
                        </motion.button>
                        {!isDone && (
                          <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                            onClick={() => enterFocus(task)}
                            className="p-1 rounded hover:bg-purple-500/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
                            <Crosshair size={13} />
                          </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                          onClick={() => deleteTask(task.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-2 mb-5">
        <motion.div
          className="w-5 h-0.5 bg-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 20 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Overview</h2>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-[var(--color-border)] pb-3 overflow-x-auto">
        {OVERVIEW_TABS.map((tab, idx) => (
          <motion.button
            key={tab.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + idx * 0.05 }}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${activeTab === tab.id
                ? 'text-purple-400'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'
              }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="overviewTabBg"
                className="absolute inset-0 bg-purple-500/15 rounded-lg shadow-sm shadow-purple-500/10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>

      <motion.div
        layout
        className="rounded-xl border border-[var(--color-border)] overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>

        {/* Add from the full Tasks page */}
        {activeTab === 'todo' && (
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={onAddTaskRequest}
            className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors border-t border-[var(--color-border)]"
          >
            <Plus size={14} /> New task
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Quick Stats Sidebar ── */
function QuickStats() {
  const { tasks, completedToday, totalToday, completionRate } = useTasks();
  const { todaySessions } = useTimer();
  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  const stats = [
    { icon: Target, label: 'Total Tasks', value: tasks.length, color: '#9333ea' },
    { icon: CheckSquare, label: 'Done Today', value: completedToday, color: '#22c55e' },
    { icon: CalendarDays, label: "Today's Tasks", value: totalToday, color: '#f59e0b' },
    { icon: BookOpen, label: 'Focus Sessions', value: todaySessions, color: '#6366f1' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <motion.div
          className="w-5 h-0.5 bg-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 20 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Quick Stats</h3>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 space-y-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="flex items-center gap-3 group"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${stat.color}15` }}
            >
              <stat.icon size={16} style={{ color: stat.color }} />
            </motion.div>
            <div className="flex-1">
              <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stat.value}</p>
            </div>
          </motion.div>
        ))}

        {/* Completion progress */}
        <div className="pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Today's Progress</span>
            <span className="text-xs font-semibold text-purple-400">{completionRate}%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ delay: 0.8, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
            />
          </div>
        </div>
      </div>

      {/* Quote card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(147,51,234,0.1)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4"
      >
        <p className="text-sm text-[var(--color-text-secondary)] italic leading-relaxed">
          "{quote.text}"
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">— {quote.author}</p>
      </motion.div>

      <PomodoroMini />
    </motion.div>
  );
}

/* ── Pomodoro Mini Widget ── */
function PomodoroMini() {
  const { timeLeft, isRunning, isBreak, todaySessions, focusDuration, breakDuration, start, pause, reset } = useTimer();
  const maxTime = isBreak ? breakDuration : focusDuration;
  const progress = timeLeft / maxTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(147,51,234,0.1)' }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {isBreak ? '☕ Break' : '🔥 Focus Timer'}
        </h4>
        <span className="text-xs text-[var(--color-text-muted)]">{todaySessions} sessions today</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none"
              stroke={isBreak ? '#22c55e' : '#9333ea'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={176}
              animate={{ strokeDashoffset: 176 * (1 - progress) }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)]">
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={isRunning ? pause : start}
            className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20"
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.15, rotate: -45 }}
            whileTap={{ scale: 0.85 }}
            onClick={reset}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Finance Summary Widget ── */
function FinanceWidget({ className = '' }) {
  const { monthlyIncome, monthlyExpenses, balance, expensesByCategory, budget } = useFinance();
  const pct = budget > 0 ? Math.min(Math.round((monthlyExpenses / budget) * 100), 100) : 0;
  const isOver = monthlyExpenses > budget && budget > 0;
  const hasData = monthlyIncome > 0 || monthlyExpenses > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, boxShadow: '0 16px 48px rgba(0,0,0,0.2), 0 0 20px rgba(147,51,234,0.05)' }}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 h-full transition-all ${className}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Wallet size={13} className="text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">Finance</span>
        <span className="text-[9px] text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded-md ml-auto">This month</span>
      </div>

      {hasData ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-white/[0.03] border border-[var(--color-border)] px-3 py-2.5">
            <p className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium mb-0.5">Balance</p>
            <p className={`text-xl font-bold tracking-tight tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {balance >= 0 ? '+' : '-'}{formatRupees(Math.abs(balance))}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-2">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp size={10} className="text-emerald-400" />
                <span className="text-[9px] text-emerald-400/70 font-medium">Income</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">{formatRupees(monthlyIncome)}</p>
            </div>
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-2.5 py-2">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingDown size={10} className="text-red-400" />
                <span className="text-[9px] text-red-400/70 font-medium">Spent</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">{formatRupees(monthlyExpenses)}</p>
            </div>
          </div>

          {expensesByCategory.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg bg-white/[0.03] border border-[var(--color-border)] px-3 py-2.5">
              <p className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium mb-0.5">Top spending</p>
              {expensesByCategory.slice(0, 3).map(cat => (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <span className="text-[10px]">{cat.icon}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] flex-1 truncate">{cat.label}</span>
                  <span className="text-[10px] font-semibold text-[var(--color-text-primary)] tabular-nums">{formatRupees(cat.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <p className="text-xs text-[var(--color-text-muted)]">
            No transactions yet — head to <span className="text-purple-400 font-medium">Finance</span> to start tracking
          </p>
        </div>
      )}

      {/* Budget bar (compact, below) */}
      {budget > 0 && hasData && (
        <div className="mt-3 pt-2.5 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Target size={11} className="text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'}`}
                />
              </div>
            </div>
            <span className={`text-[10px] font-semibold tabular-nums ${isOver ? 'text-red-400' : 'text-[var(--color-text-secondary)]'}`}>
              {formatRupees(monthlyExpenses)} / {formatRupees(budget)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(() => storage.get('lifeos-image-theme', 'neon'));

  const switchTheme = (id) => {
    setCurrentTheme(id);
    storage.set('lifeos-image-theme', id);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const openTaskCreator = () => {
    onNavigate?.('tasks', 'new-task');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <HeroBanner currentTheme={currentTheme} onSwitchTheme={switchTheme} />

      <motion.div
        className="mt-6 mb-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="hidden sm:flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)]/70 px-3 py-2 shadow-sm"
          >
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden">
              <span className="absolute inset-x-2 top-1 h-px bg-white/35" />
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight select-none">
              Life<span className="text-purple-400">OS</span>
            </span>
          </motion.div>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <motion.div
            className="w-1 h-5 bg-purple-500 rounded-full"
            initial={{ height: 0 }}
            animate={{ height: 20 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
          <p className="text-sm text-[var(--color-text-secondary)]">{todayDate}</p>
        </div>
      </motion.div>

      <div className="mt-2 mb-6">
        <LiveClock />
      </div>

      <CategoryCards currentTheme={currentTheme} />

      <DueSoonTasks />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6 items-start mb-8">
        <NotesFlashcards compact className="min-w-0" />
        <FinanceWidget className="min-w-0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OverviewTable onAddTaskRequest={openTaskCreator} />
        </div>
        <div>
          <QuickStats />
        </div>
      </div>
    </motion.div>
  );
}
