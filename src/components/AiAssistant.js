import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, Send, Loader2, CheckCircle2, AlertCircle,
  ListTodo, Wallet, Flame, Target,
  Search, Droplets, Moon, BookOpen, Plus, Trash2, Edit3, Eye,
  ArrowRight, Zap,
} from 'lucide-react';
import { api } from '../utils/api';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NotesContext';
import { useHabits } from '../context/HabitsContext';
import { useFinance } from '../context/FinanceContext';
import { useJournal } from '../context/JournalContext';

const TOOL_META = {
  create_task:            { label: 'Created task',       icon: Plus,         accent: 'purple' },
  update_task:            { label: 'Updated task',       icon: Edit3,        accent: 'blue' },
  complete_task:          { label: 'Completed task',     icon: CheckCircle2, accent: 'emerald' },
  delete_task:            { label: 'Deleted task',       icon: Trash2,       accent: 'rose' },
  list_tasks:             { label: 'Fetched tasks',      icon: ListTodo,     accent: 'slate' },
  create_note:            { label: 'Created note',       icon: Plus,         accent: 'amber' },
  update_note:            { label: 'Updated note',       icon: Edit3,        accent: 'blue' },
  delete_note:            { label: 'Deleted note',       icon: Trash2,       accent: 'rose' },
  search_notes:           { label: 'Searched notes',     icon: Search,       accent: 'slate' },
  log_transaction:        { label: 'Logged transaction', icon: Wallet,       accent: 'emerald' },
  query_finance:          { label: 'Queried finance',    icon: Wallet,       accent: 'slate' },
  create_habit:           { label: 'Created habit',      icon: Plus,         accent: 'purple' },
  toggle_habit:           { label: 'Toggled habit',      icon: Flame,        accent: 'orange' },
  list_habits:            { label: 'Fetched habits',     icon: Flame,        accent: 'slate' },
  log_water:              { label: 'Logged water',       icon: Droplets,     accent: 'cyan' },
  log_sleep:              { label: 'Logged sleep',       icon: Moon,         accent: 'indigo' },
  log_journal:            { label: 'Journal entry',      icon: BookOpen,     accent: 'violet' },
  create_goal:            { label: 'Created goal',       icon: Target,       accent: 'fuchsia' },
  get_dashboard_snapshot: { label: 'Read state',         icon: Eye,          accent: 'slate' },
};

const ACCENT_CLASS = {
  purple:   'from-purple-500/15  to-violet-500/5   border-purple-500/25  text-purple-300',
  violet:   'from-violet-500/15  to-fuchsia-500/5  border-violet-500/25  text-violet-300',
  fuchsia:  'from-fuchsia-500/15 to-pink-500/5     border-fuchsia-500/25 text-fuchsia-300',
  blue:     'from-blue-500/15    to-cyan-500/5     border-blue-500/25    text-blue-300',
  cyan:     'from-cyan-500/15    to-sky-500/5      border-cyan-500/25    text-cyan-300',
  indigo:   'from-indigo-500/15  to-blue-500/5     border-indigo-500/25  text-indigo-300',
  emerald:  'from-emerald-500/15 to-green-500/5    border-emerald-500/25 text-emerald-300',
  amber:    'from-amber-500/15   to-yellow-500/5   border-amber-500/25   text-amber-300',
  orange:   'from-orange-500/15  to-red-500/5      border-orange-500/25  text-orange-300',
  rose:     'from-rose-500/15    to-red-500/5      border-rose-500/25    text-rose-300',
  slate:    'from-white/[0.04]   to-transparent    border-white/10       text-white/60',
};

const SUGGESTIONS = [
  'Add a task to submit the quarterly report by friday at high priority',
  'I spent 500 on groceries today',
  'Mark meditation done for today',
  'What did I spend this month on food?',
  'Show my overdue tasks',
  'Create a note titled Ideas with content: launch checklist draft',
];

function MUTATES(tool) {
  return !['list_tasks', 'search_notes', 'query_finance', 'list_habits', 'get_dashboard_snapshot'].includes(tool);
}

function ActionCard({ action, index }) {
  const meta = TOOL_META[action.tool] || { label: action.tool, icon: Zap, accent: 'slate' };
  const Icon = meta.icon;
  const accent = ACCENT_CLASS[meta.accent] || ACCENT_CLASS.slate;
  const detail = action.message || 'Done';
  const isFail = !action.success;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-3 rounded-xl border bg-gradient-to-r ${isFail ? 'from-rose-500/10 to-transparent border-rose-500/25 text-rose-300' : accent} px-3 py-2`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
        {isFail ? <AlertCircle size={14} /> : <Icon size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight truncate">
          {isFail ? 'Failed' : meta.label}
        </p>
        <p className="text-[11px] text-white/50 leading-tight truncate">{detail}</p>
      </div>
      {!isFail && <CheckCircle2 size={14} className="shrink-0 text-emerald-400/70" />}
    </motion.div>
  );
}

export default function AiAssistant({ onClose }) {
  const [messages, setMessages] = useState([]);  // { role, content, actions?, id }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => Date.now().toString(36) + Math.random().toString(36).slice(2));
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshNotes } = useNotes();
  const { refresh: refreshHabits } = useHabits();
  const { refresh: refreshFinance } = useFinance();
  const { refresh: refreshJournal } = useJournal();

  const refreshAfterActions = useCallback((actions = []) => {
    const tools = new Set(actions.filter(a => a.success).map(a => a.tool));
    if (['create_task', 'update_task', 'complete_task', 'delete_task'].some(t => tools.has(t))) refreshTasks?.();
    if (['create_note', 'update_note', 'delete_note'].some(t => tools.has(t))) refreshNotes?.();
    if (['create_habit', 'toggle_habit'].some(t => tools.has(t))) refreshHabits?.();
    if (tools.has('log_transaction')) refreshFinance?.();
    if (tools.has('log_journal')) refreshJournal?.();
  }, [refreshTasks, refreshNotes, refreshHabits, refreshFinance, refreshJournal]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const userMsg = { role: 'user', content: q, id: `u_${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/ai/agent', { message: q, conversationId });
      const actions = data.actions || [];
      const assistantMsg = {
        role: 'assistant',
        content: data.answer || '',
        actions,
        id: `a_${Date.now()}`,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (actions.some(a => a.success && MUTATES(a.tool))) refreshAfterActions(actions);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'Request failed. Please try again.',
        error: true,
        id: `e_${Date.now()}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-[540px] flex-col">
      {/* Scrollable conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-xl shadow-purple-500/30"
            >
              <Sparkles size={22} className="text-white" />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-2xl bg-purple-500"
              />
            </motion.div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">LifeOS AI</h3>
            <p className="mb-5 text-center text-[12px] text-[var(--color-text-muted)] max-w-sm">
              I can add tasks, log expenses, check off habits, answer questions about your data, and more. Just ask.
            </p>
            <div className="w-full space-y-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Try
              </p>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="group flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] text-[var(--color-text-secondary)] transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.05] hover:text-[var(--color-text-primary)]"
                >
                  <Sparkles size={11} className="shrink-0 text-purple-400/60" />
                  <span className="flex-1 truncate">{s}</span>
                  <ArrowRight size={12} className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 px-1"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500">
                <Loader2 size={12} className="animate-spin text-white" />
              </div>
              <span className="text-[12px] text-[var(--color-text-muted)]">Thinking and taking action…</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-darker)]/40 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/25">
            <Sparkles size={14} className="text-white" />
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            placeholder={loading ? 'Working…' : 'Ask anything or tell me what to do…'}
            className="flex-1 bg-transparent text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-50"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/25 transition-opacity disabled:opacity-40"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-purple-500 to-violet-600 px-3.5 py-2 text-[13px] text-white shadow-md shadow-purple-500/20">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/25">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-1.5">
            <AnimatePresence>
              {message.actions.map((a, i) => (
                <ActionCard key={`${a.tool}-${i}`} action={a} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
        {message.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (message.actions?.length || 0) * 0.04 + 0.1 }}
            className={`rounded-2xl rounded-tl-md border px-3.5 py-2 text-[13px] leading-relaxed ${
              message.error
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'border-[var(--color-border)] bg-white/[0.03] text-[var(--color-text-primary)]'
            }`}
          >
            {message.content}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
