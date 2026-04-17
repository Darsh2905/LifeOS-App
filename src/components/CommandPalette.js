import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, LayoutDashboard, ListTodo, Clock, StickyNote,
  BarChart3, Settings, Play, Plus, ArrowRight, X, Wallet,
  Sparkles, CornerDownLeft, Heart
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NotesContext';
import { useTimer } from '../context/TimerContext';
import { api } from '../utils/api';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home overview due soon stats' },
  { id: 'wellness', label: 'Wellness', icon: Heart, keywords: 'journal habits workout meals sleep mood health' },
  { id: 'finance', label: 'Finance', icon: Wallet, keywords: 'money budget income expense transactions rupees' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, keywords: 'todo priority due recurring' },
  { id: 'timer', label: 'Timer', icon: Clock, keywords: 'focus pomodoro sessions' },
  { id: 'notes', label: 'Notes', icon: StickyNote, keywords: 'writing flashcards tags' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, keywords: 'charts progress reports' },
  { id: 'settings', label: 'Settings', icon: Settings, keywords: 'theme accent profile data' },
];

function includesQuery(value, query) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export default function CommandPalette({ activePage, onNavigate }) {
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { start } = useTimer();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setAiMode(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        setIsOpen(true);
        setAiMode(true);
      }
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setAiAnswer(null);
      setAiError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset answer when query changes
    setAiAnswer(null);
    setAiError(null);
  }, [query, aiMode]);

  const results = useMemo(() => {
    if (aiMode) return [];
    const trimmed = query.trim();
    const pageResults = pages
      .filter(page => !trimmed || includesQuery(`${page.label} ${page.keywords}`, trimmed))
      .map(page => ({
        id: `page-${page.id}`,
        type: 'Page',
        title: page.label,
        subtitle: page.id === activePage ? 'Current page' : 'Go to page',
        icon: page.icon,
        action: () => onNavigate(page.id),
      }));

    const taskResults = tasks
      .filter(task => trimmed && includesQuery(`${task.title || ''} ${task.priority || ''} ${task.dueDate || ''} ${task.recurring || ''}`, trimmed))
      .slice(0, 6)
      .map(task => ({
        id: `task-${task.id}`,
        type: 'Task',
        title: task.title || 'Untitled task',
        subtitle: [task.priority, task.dueDate, task.recurring && task.recurring !== 'none' ? task.recurring : null].filter(Boolean).join(' · ') || 'Open tasks',
        icon: ListTodo,
        action: () => onNavigate('tasks'),
      }));

    const noteResults = notes
      .filter(note => trimmed && includesQuery(`${note.title || ''} ${note.content || ''} ${(note.tags || []).join(' ')}`, trimmed))
      .slice(0, 6)
      .map(note => ({
        id: `note-${note.id}`,
        type: 'Note',
        title: note.title || 'Untitled note',
        subtitle: note.content ? `${note.content.slice(0, 72)}${note.content.length > 72 ? '...' : ''}` : 'Open notes',
        icon: StickyNote,
        action: () => onNavigate('notes'),
      }));

    const actions = [
      {
        id: 'action-ask-ai',
        type: 'AI',
        title: 'Ask LifeOS AI',
        subtitle: 'Query your data in natural language',
        icon: Sparkles,
        action: () => { setAiMode(true); setQuery(''); },
        keywords: 'ai ask question claude assistant',
      },
      {
        id: 'action-start-timer',
        type: 'Action',
        title: 'Start focus timer',
        subtitle: 'Begin the current timer session',
        icon: Play,
        action: () => {
          start();
          onNavigate('timer');
        },
        keywords: 'start focus timer play',
      },
      {
        id: 'action-new-task',
        type: 'Action',
        title: 'Create a task',
        subtitle: 'Open the Tasks page',
        icon: Plus,
        action: () => onNavigate('tasks'),
        keywords: 'new add create task todo',
      },
      {
        id: 'action-new-note',
        type: 'Action',
        title: 'Create a note',
        subtitle: 'Open the Notes page',
        icon: Plus,
        action: () => onNavigate('notes'),
        keywords: 'new add create note write',
      },
    ].filter(action => !trimmed || includesQuery(`${action.title} ${action.subtitle} ${action.keywords}`, trimmed));

    return [...actions, ...pageResults, ...taskResults, ...noteResults].slice(0, 12);
  }, [activePage, notes, onNavigate, query, start, tasks, aiMode]);

  const run = (item) => {
    item.action();
    if (item.type !== 'AI') setIsOpen(false);
  };

  const runAiQuery = async () => {
    const q = query.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiAnswer(null);
    setAiError(null);
    try {
      const data = await api.post('/ai/query', { query: q });
      setAiAnswer(data.answer || 'No answer returned.');
    } catch (err) {
      setAiError(err.message || 'AI request failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && aiMode) {
      e.preventDefault();
      runAiQuery();
    }
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-30 hidden md:flex items-center gap-2 rounded-2xl border border-[var(--color-border)] glass-card px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)] shadow-lg shadow-black/20 hover:text-[var(--color-text-primary)] btn-sheen"
      >
        <Sparkles size={15} className="text-purple-400" />
        Ask or search
        <span className="rounded-md border border-[var(--color-border)] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          ⌘K
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-24"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={event => event.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--color-border)] glass-card shadow-2xl"
            >
              {/* gradient top border accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setAiMode(m => !m)}
                  title={aiMode ? 'Switch to search' : 'Switch to AI mode (⌘J)'}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    aiMode
                      ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30'
                      : 'text-purple-400 hover:bg-white/5'
                  }`}
                >
                  {aiMode ? <Sparkles size={16} /> : <Search size={16} />}
                </motion.button>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={aiMode ? 'Ask anything about your data…' : 'Search tasks, notes, pages, and actions…'}
                  className="flex-1 bg-transparent text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
                />
                {aiMode && (
                  <button
                    onClick={runAiQuery}
                    disabled={!query.trim() || aiLoading}
                    className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white/[0.04] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                  >
                    Ask <CornerDownLeft size={11} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[460px] overflow-y-auto p-2">
                {aiMode ? (
                  <div className="px-4 py-6">
                    {!query.trim() && !aiAnswer && !aiLoading && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                          <Sparkles size={12} className="text-purple-400" /> Try asking
                        </div>
                        {[
                          'How much did I spend last month?',
                          'What is my longest current streak?',
                          'How many tasks did I complete this week?',
                          'Mood trend over the last 30 days',
                        ].map(sample => (
                          <button
                            key={sample}
                            onClick={() => setQuery(sample)}
                            className="block w-full rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)]"
                          >
                            {sample}
                          </button>
                        ))}
                      </div>
                    )}

                    {aiLoading && (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="ambient-loader" />
                        <p className="text-sm text-[var(--color-text-muted)]">Thinking…</p>
                      </div>
                    )}

                    {aiError && !aiLoading && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                        {aiError}
                      </div>
                    )}

                    {aiAnswer && !aiLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.06] to-transparent p-4"
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                          <Sparkles size={12} /> Answer
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">
                          {aiAnswer}
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">No results</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Try a task title, note tag, or page name.</p>
                  </div>
                ) : (
                  results.map((item, index) => {
                    const Icon = item.icon;
                    const isAi = item.type === 'AI';
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => run(item)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.05]"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isAi
                            ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/25'
                            : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</span>
                            <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{item.type}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">{item.subtitle}</span>
                        </span>
                        <ArrowRight size={15} className="text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.button>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5 text-[10px] text-[var(--color-text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5">⌘K</kbd> search
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5">⌘J</kbd> AI
                  </span>
                </div>
                <span>esc to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
