import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, LayoutDashboard, ListTodo, Clock, StickyNote,
  BarChart3, Settings, Play, Plus, ArrowRight, X, Wallet
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NotesContext';
import { useTimer } from '../context/TimerContext';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home overview due soon stats' },
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
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
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
    }
  }, [isOpen]);

  const results = useMemo(() => {
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
  }, [activePage, notes, onNavigate, query, start, tasks]);

  const run = (item) => {
    item.action();
    setIsOpen(false);
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-30 hidden md:flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)]/80 px-3 py-2 text-sm text-[var(--color-text-secondary)] backdrop-blur-xl shadow-lg shadow-black/10 hover:text-[var(--color-text-primary)]"
      >
        <Search size={15} className="text-purple-400" />
        Search
        <span className="rounded-md border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          Ctrl K
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={event => event.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                <Search size={18} className="text-purple-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search tasks, notes, pages, and actions..."
                  className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">No results</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Try a task title, note tag, or page name.</p>
                  </div>
                ) : (
                  results.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => run(item)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
