import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BentoCard from '../components/BentoCard';
import { useTasks } from '../context/TaskContext';
import { useFocus } from '../context/FocusContext';
import { PRIORITIES, PRIORITY_COLORS, TASK_STATES } from '../utils/constants';
import { Plus, Check, Clock, Crosshair, Trash2 } from 'lucide-react';

export default function DailyPlanner() {
  const { todayTasks, addTask, updateTask, deleteTask } = useTasks();
  const { enterFocus } = useFocus();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState(PRIORITIES.MEDIUM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), time, priority });
    setTitle('');
    setTime('09:00');
    setPriority(PRIORITIES.MEDIUM);
    setShowForm(false);
  };

  const sorted = [...todayTasks].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <BentoCard delay={0.1} className="col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Daily Planner</h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus size={14} /> Add Task
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden mb-4"
          >
            <div className="p-3 rounded-xl bg-white/5 space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title..."
                autoFocus
                className="w-full bg-transparent border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--accent-color)] transition-colors"
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Clock size={14} className="text-[var(--color-text-muted)]" />
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="bg-transparent border border-[var(--color-glass-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)] transition-colors"
                  />
                </div>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="bg-[var(--color-surface-dark)] border border-[var(--color-glass-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'var(--accent-color)' }}
                >
                  Add
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[var(--color-text-muted)] text-center py-8"
            >
              No tasks planned for today. Add one to get started!
            </motion.p>
          ) : (
            sorted.map(task => {
              const isDone = task.status === TASK_STATES.DONE;
              const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                    isDone ? 'bg-white/[0.02]' : 'bg-white/5 hover:bg-white/[0.08]'
                  }`}
                >
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => updateTask(task.id, {
                      status: isDone ? TASK_STATES.TODO : TASK_STATES.DONE
                    })}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? 'border-emerald-400 bg-emerald-400'
                        : 'border-[var(--color-text-muted)] hover:border-[var(--accent-color)]'
                    }`}
                  >
                    {isDone && <Check size={12} className="text-white" />}
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isDone ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
                    }`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.time && (
                        <span className="text-xs text-[var(--color-text-muted)]">{task.time}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isDone && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => enterFocus(task)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"
                        title="Focus on this"
                      >
                        <Crosshair size={14} />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </BentoCard>
  );
}
