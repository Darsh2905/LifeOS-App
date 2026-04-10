import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BentoCard from '../components/BentoCard';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import { useTasks } from '../context/TaskContext';
import { TASK_STATES, PRIORITIES, PRIORITY_COLORS, RECURRENCE_OPTIONS } from '../utils/constants';
import { Plus, Filter, Check, ArrowRight, Trash2, Pencil, CalendarDays, Save, Repeat2 } from 'lucide-react';

const stateLabels = {
  [TASK_STATES.TODO]: 'To Do',
  [TASK_STATES.IN_PROGRESS]: 'In Progress',
  [TASK_STATES.DONE]: 'Done',
};

const stateColors = {
  [TASK_STATES.TODO]: 'var(--accent-color)',
  [TASK_STATES.IN_PROGRESS]: '#f59e0b',
  [TASK_STATES.DONE]: '#22c55e',
};

function nextState(status) {
  if (status === TASK_STATES.TODO) return TASK_STATES.IN_PROGRESS;
  if (status === TASK_STATES.IN_PROGRESS) return TASK_STATES.DONE;
  return TASK_STATES.TODO;
}

function formatDateForInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(...value.split('-').map((part, index) => index === 1 ? Number(part) - 1 : Number(part)))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function formatTaskDate(value) {
  if (!value) return 'No date';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(...value.split('-').map((part, index) => index === 1 ? Number(part) - 1 : Number(part)))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TasksPage({ pageAction, onPageActionHandled }) {
  const { tasks, addTask, updateTask, deleteTask, completionRate } = useTasks();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState(PRIORITIES.MEDIUM);
  const [newDueDate, setNewDueDate] = useState('');
  const [newRecurring, setNewRecurring] = useState('none');
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState(PRIORITIES.MEDIUM);
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurring, setEditRecurring] = useState('none');

  useEffect(() => {
    if (pageAction?.page !== 'tasks' || pageAction.action !== 'new-task') return;

    setEditingTask(null);
    setShowModal(true);
    onPageActionHandled?.();
  }, [onPageActionHandled, pageAction]);

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim(), priority: newPriority, dueDate: newDueDate, recurring: newRecurring });
    setNewTitle('');
    setNewDueDate('');
    setNewRecurring('none');
    setShowModal(false);
  };

  const advanceTaskStatus = (task) => {
    const status = nextState(task.status);
    updateTask(task.id, {
      status,
      ...(status === TASK_STATES.DONE ? { lastCompletedAt: new Date().toISOString() } : {}),
    });
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditPriority(task.priority || PRIORITIES.MEDIUM);
    setEditDueDate(formatDateForInput(task.dueDate));
    setEditRecurring(task.recurring || 'none');
  };

  const closeEdit = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditPriority(PRIORITIES.MEDIUM);
    setEditDueDate('');
    setEditRecurring('none');
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    updateTask(editingTask.id, {
      title: editTitle.trim(),
      priority: editPriority,
      dueDate: editDueDate,
      recurring: editRecurring,
    });
    closeEdit();
  };

  const grouped = {
    [TASK_STATES.TODO]: filtered.filter(t => t.status === TASK_STATES.TODO),
    [TASK_STATES.IN_PROGRESS]: filtered.filter(t => t.status === TASK_STATES.IN_PROGRESS),
    [TASK_STATES.DONE]: filtered.filter(t => t.status === TASK_STATES.DONE),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Tasks</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tasks.length} total tasks</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus size={16} /> New Task
        </motion.button>
      </div>

      <BentoCard delay={0.05}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">Filters</span>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
            >
              <option value="all">All Status</option>
              <option value={TASK_STATES.TODO}>To Do</option>
              <option value={TASK_STATES.IN_PROGRESS}>In Progress</option>
              <option value={TASK_STATES.DONE}>Done</option>
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <ProgressBar value={completionRate} />
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{completionRate}% completed today</p>
      </BentoCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([status, items], i) => (
          <BentoCard key={status} delay={0.1 + i * 0.05}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: stateColors[status] }} />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {stateLabels[status]}
              </h3>
              <span className="text-xs text-[var(--color-text-muted)] ml-auto">{items.length}</span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {items.map(task => {
                  const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <p className={`text-sm font-medium text-[var(--color-text-primary)] ${
                          task.status === TASK_STATES.DONE ? 'line-through opacity-60' : ''
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => openEdit(task)}
                            className="p-1 rounded hover:bg-purple-500/10 text-[var(--color-text-muted)] hover:text-purple-400"
                            title="Edit task"
                          >
                            <Pencil size={13} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => advanceTaskStatus(task)}
                            className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)]"
                            title={task.status === TASK_STATES.DONE ? 'Reopen' : 'Next status'}
                          >
                            {task.status === TASK_STATES.DONE ? <Check size={13} /> : <ArrowRight size={13} />}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                          {task.priority}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <CalendarDays size={10} />
                          {formatTaskDate(task.dueDate)}
                        </span>
                        {task.recurring && task.recurring !== 'none' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-400">
                            <Repeat2 size={10} />
                            {task.recurring}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {items.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No tasks</p>
              )}
            </div>
          </BentoCard>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Task">
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            className="w-full bg-transparent border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--accent-color)] transition-colors"
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value)}
            className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none"
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <input
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
            type="date"
            className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
          />
          <select
            value={newRecurring}
            onChange={e => setNewRecurring(e.target.value)}
            className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
          >
            {RECURRENCE_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--accent-color)' }}
          >
            Create Task
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!editingTask} onClose={closeEdit} title="Edit Task">
        <form onSubmit={handleEdit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Task</span>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="w-full bg-transparent border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--accent-color)] transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Due Date</span>
            <input
              value={editDueDate}
              onChange={e => setEditDueDate(e.target.value)}
              type="date"
              className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Priority</span>
            <select
              value={editPriority}
              onChange={e => setEditPriority(e.target.value)}
              className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Repeat</span>
            <select
              value={editRecurring}
              onChange={e => setEditRecurring(e.target.value)}
              className="w-full bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
            >
              {RECURRENCE_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={closeEdit}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
              style={{ background: 'var(--accent-color)' }}
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
