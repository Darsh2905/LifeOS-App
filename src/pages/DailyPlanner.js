import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BentoCard from '../components/BentoCard';
import { usePlanner } from '../context/PlannerContext';
import { useTasks } from '../context/TaskContext';
import { useHabits } from '../context/HabitsContext';
import { api } from '../utils/api';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Check, Clock,
  Trash2, Star, Sparkles, Sun, Sunrise, Sunset, Moon,
  BatteryLow, BatteryMedium, BatteryFull, BatteryCharging,
  Target, Pencil, X, Save, Zap, Flame, Brain, Loader2
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const ENERGY_LEVELS = [
  { value: 1, label: 'Low', icon: BatteryLow, color: 'red' },
  { value: 2, label: 'Medium', icon: BatteryMedium, color: 'amber' },
  { value: 3, label: 'Good', icon: BatteryFull, color: 'emerald' },
  { value: 4, label: 'High', icon: BatteryCharging, color: 'purple' },
];

const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', icon: Sunrise, range: '6 AM – 12 PM', color: 'amber' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, range: '12 PM – 5 PM', color: 'sky' },
  { id: 'evening', label: 'Evening', icon: Sunset, range: '5 PM – 9 PM', color: 'purple' },
  { id: 'night', label: 'Night', icon: Moon, range: '9 PM – 12 AM', color: 'indigo' },
];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(date) {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export default function DailyPlanner() {
  const { currentPlan, fetchPlan, savePlan } = usePlanner();
  const { tasks } = useTasks();
  const { habits } = useHabits();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [topPriorities, setTopPriorities] = useState(['', '', '']);
  const [schedule, setSchedule] = useState({ morning: [], afternoon: [], evening: [], night: [] });
  const [energyLevel, setEnergyLevel] = useState(3);
  const [reflection, setReflection] = useState('');
  const [notes, setNotes] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingBlock, setAddingBlock] = useState(null);
  const [newBlockText, setNewBlockText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTips, setAiTips] = useState('');
  const [aiSummary, setAiSummary] = useState(null);

  const dateStr = formatDate(selectedDate);

  useEffect(() => {
    fetchPlan(dateStr);
  }, [dateStr, fetchPlan]);

  useEffect(() => {
    if (currentPlan) {
      setTopPriorities(currentPlan.topPriorities?.length ? currentPlan.topPriorities : ['', '', '']);
      setSchedule(currentPlan.schedule || { morning: [], afternoon: [], evening: [], night: [] });
      setEnergyLevel(currentPlan.energyLevel || 3);
      setReflection(currentPlan.reflection || '');
      setNotes(currentPlan.notes || '');
      setIsDirty(false);
    } else {
      setTopPriorities(['', '', '']);
      setSchedule({ morning: [], afternoon: [], evening: [], night: [] });
      setEnergyLevel(3);
      setReflection('');
      setNotes('');
      setIsDirty(false);
    }
  }, [currentPlan]);

  const navigateDay = (offset) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    setSelectedDate(next);
  };

  const goToToday = () => setSelectedDate(new Date());

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updatePriority = (idx, value) => {
    const updated = [...topPriorities];
    updated[idx] = value;
    setTopPriorities(updated);
    markDirty();
  };

  const addScheduleItem = (blockId) => {
    if (!newBlockText.trim()) return;
    setSchedule(prev => ({
      ...prev,
      [blockId]: [...(prev[blockId] || []), { id: Date.now(), text: newBlockText.trim(), done: false }],
    }));
    setNewBlockText('');
    setAddingBlock(null);
    markDirty();
  };

  const toggleScheduleItem = (blockId, itemId) => {
    setSchedule(prev => ({
      ...prev,
      [blockId]: prev[blockId].map(item =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    }));
    markDirty();
  };

  const removeScheduleItem = (blockId, itemId) => {
    setSchedule(prev => ({
      ...prev,
      [blockId]: prev[blockId].filter(item => item.id !== itemId),
    }));
    markDirty();
  };

  const generateAISchedule = async () => {
    setAiGenerating(true);
    setAiTips('');
    setAiSummary(null);
    try {
      const result = await api.post('/ai/smart-schedule', { date: dateStr, energyLevel });
      // Merge AI-generated items into the schedule
      const newSchedule = { ...schedule };
      for (const block of ['morning', 'afternoon', 'evening', 'night']) {
        if (result[block] && result[block].length > 0) {
          const existingTexts = new Set((newSchedule[block] || []).map(i => i.text.toLowerCase()));
          const newItems = result[block]
            .filter(item => !existingTexts.has(item.text.toLowerCase()))
            .map(item => ({ id: Date.now() + Math.random(), text: item.text, done: false, type: item.type }));
          newSchedule[block] = [...(newSchedule[block] || []), ...newItems];
        }
      }
      setSchedule(newSchedule);
      if (result.tips) setAiTips(result.tips);
      if (result.summary || result.intensityLabel) setAiSummary({ summary: result.summary, intensityLabel: result.intensityLabel });
      markDirty();
    } catch (err) {
      console.error('AI schedule error:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await savePlan({
      date: dateStr,
      topPriorities: topPriorities.filter(p => p.trim()),
      schedule,
      energyLevel,
      reflection,
      notes,
    });
    setIsDirty(false);
    setSaving(false);
  };

  const todayTasks = useMemo(() => {
    const today = formatDate(selectedDate);
    return tasks.filter(t => t.dueDate === today && t.status !== 'done');
  }, [tasks, selectedDate]);

  const todayHabits = useMemo(() => {
    const today = formatDate(selectedDate);
    return habits.map(h => ({
      ...h,
      completedToday: h.completedDays?.includes(today),
    }));
  }, [habits, selectedDate]);

  const totalScheduleItems = Object.values(schedule).flat().length;
  const doneScheduleItems = Object.values(schedule).flat().filter(i => i.done).length;
  const progressPct = totalScheduleItems > 0 ? Math.round((doneScheduleItems / totalScheduleItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <CalendarDays size={20} className="text-white" />
            </div>
            Daily Planner
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 ml-[52px]">
            Plan your day, track your progress
          </p>
        </div>

        {isDirty && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Plan'}
          </motion.button>
        )}
      </motion.div>

      {/* Date navigator */}
      <BentoCard delay={0.1} noPadding>
        <div className="flex items-center justify-between px-5 py-4">
          <motion.button whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }} onClick={() => navigateDay(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all">
            <ChevronLeft size={18} />
          </motion.button>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {formatDisplay(selectedDate)}
            </h2>
            {!isToday(selectedDate) && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goToToday}
                className="px-3 py-1 rounded-lg text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/15 transition-colors">
                Today
              </motion.button>
            )}
            {isToday(selectedDate) && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10">
                Today
              </span>
            )}
          </div>

          <motion.button whileHover={{ scale: 1.1, x: 2 }} whileTap={{ scale: 0.9 }} onClick={() => navigateDay(1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all">
            <ChevronRight size={18} />
          </motion.button>
        </div>

        {/* Progress bar */}
        {totalScheduleItems > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest">Progress</span>
              <span className="text-xs font-bold text-purple-400">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500"
              />
            </div>
          </div>
        )}
      </BentoCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Priorities + Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 3 Priorities */}
          <BentoCard delay={0.15}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star size={15} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Top 3 Priorities</h3>
            </div>
            <div className="space-y-3">
              {topPriorities.map((priority, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08, ease }}
                  className="flex items-center gap-3 group"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    priority.trim()
                      ? 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-400'
                      : 'bg-white/5 text-[var(--color-text-muted)]'
                  }`}>
                    {idx + 1}
                  </span>
                  <input
                    value={priority}
                    onChange={e => updatePriority(idx, e.target.value)}
                    placeholder={`Priority #${idx + 1}...`}
                    className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none border-b border-transparent focus:border-purple-500/30 py-1.5 transition-colors"
                  />
                  {priority.trim() && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => updatePriority(idx, '')}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <X size={12} />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </BentoCard>

          {/* Time Block Schedule */}
          <BentoCard delay={0.2} noPadding>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock size={15} className="text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Schedule</h3>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">{doneScheduleItems}/{totalScheduleItems}</span>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={generateAISchedule}
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 transition-all disabled:opacity-50"
                >
                  {aiGenerating ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
                  {aiGenerating ? 'Generating...' : 'AI Auto-Schedule'}
                </motion.button>
              </div>
            </div>

            {/* AI Tips */}
            <AnimatePresence>
              {aiTips && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mb-3 p-3 rounded-xl bg-purple-500/[0.06] border border-purple-500/15"
                >
                  {aiSummary && (
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {aiSummary.intensityLabel && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-500/12 text-purple-300 border border-purple-500/20">
                          {aiSummary.intensityLabel}
                        </span>
                      )}
                      {aiSummary.summary && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">{aiSummary.summary}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Sparkles size={12} className="text-purple-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{aiTips}</p>
                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => setAiTips('')}
                      className="shrink-0 p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]">
                      <X size={10} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="divide-y divide-[var(--color-border)]">
              {TIME_BLOCKS.map((block, blockIdx) => {
                const items = schedule[block.id] || [];
                return (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + blockIdx * 0.06, ease }}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-7 h-7 rounded-lg bg-${block.color}-500/10 flex items-center justify-center`}>
                        <block.icon size={14} className={`text-${block.color}-400`} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{block.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] ml-2">{block.range}</span>
                      </div>
                    </div>

                    <div className="pl-9 space-y-1.5">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, i) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20, height: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="flex items-center gap-2.5 group py-1"
                          >
                            <motion.button
                              whileHover={{ scale: 1.3, rotate: 5 }}
                              whileTap={{ scale: 0.7 }}
                              onClick={() => toggleScheduleItem(block.id, item.id)}
                              className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                item.done
                                  ? 'border-emerald-400 bg-emerald-400 shadow-sm shadow-emerald-500/20'
                                  : 'border-[var(--color-text-muted)]/40 hover:border-emerald-400'
                              }`}
                            >
                              {item.done && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                                  <Check size={10} className="text-white" />
                                </motion.div>
                              )}
                            </motion.button>
                            <span className={`text-sm flex-1 ${item.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                              {item.text}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={() => removeScheduleItem(block.id, item.id)}
                              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={11} />
                            </motion.button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <AnimatePresence>
                        {addingBlock === block.id ? (
                          <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={(e) => { e.preventDefault(); addScheduleItem(block.id); }}
                            className="flex items-center gap-2 pt-1"
                          >
                            <input
                              value={newBlockText}
                              onChange={e => setNewBlockText(e.target.value)}
                              placeholder="What's planned?"
                              autoFocus
                              onKeyDown={e => e.key === 'Escape' && setAddingBlock(null)}
                              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none border-b border-[var(--color-border)] focus:border-purple-500/30 py-1 transition-colors"
                            />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit"
                              className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                              <Check size={13} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => setAddingBlock(null)}
                              className="p-1.5 rounded-lg bg-white/5 text-[var(--color-text-muted)]">
                              <X size={13} />
                            </motion.button>
                          </motion.form>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(147,51,234,0.05)' }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => { setAddingBlock(block.id); setNewBlockText(''); }}
                            className="w-full py-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-purple-400 transition-all rounded-lg border border-dashed border-[var(--color-border)]/50 hover:border-purple-500/20"
                          >
                            <Plus size={11} /> Add item
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </BentoCard>
        </div>

        {/* Right column: Energy, Tasks, Habits, Reflection, Notes */}
        <div className="space-y-6">
          {/* Energy Level */}
          <BentoCard delay={0.25}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Zap size={15} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Energy</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ENERGY_LEVELS.map((level) => {
                const isSelected = energyLevel === level.value;
                return (
                  <motion.button
                    key={level.value}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setEnergyLevel(level.value); markDirty(); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? `border-${level.color}-500/30 bg-${level.color}-500/10 shadow-sm shadow-${level.color}-500/10`
                        : 'border-[var(--color-border)] bg-white/[0.02] hover:bg-white/5'
                    }`}
                  >
                    <level.icon size={18} className={isSelected ? `text-${level.color}-400` : 'text-[var(--color-text-muted)]'} />
                    <span className={`text-[10px] font-medium ${isSelected ? `text-${level.color}-400` : 'text-[var(--color-text-muted)]'}`}>
                      {level.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </BentoCard>

          {/* Today's Tasks */}
          <BentoCard delay={0.3}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Target size={15} className="text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Tasks Due</h3>
              {todayTasks.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                  {todayTasks.length}
                </span>
              )}
            </div>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No tasks due {isToday(selectedDate) ? 'today' : 'this day'}</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04, ease }}
                    className="flex items-center gap-2 py-1.5"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className="text-sm text-[var(--color-text-primary)] truncate">{task.title}</span>
                  </motion.div>
                ))}
                {todayTasks.length > 5 && (
                  <p className="text-[10px] text-[var(--color-text-muted)] text-center">+{todayTasks.length - 5} more</p>
                )}
              </div>
            )}
          </BentoCard>

          {/* Habits */}
          <BentoCard delay={0.35}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Flame size={15} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Habits</h3>
              {todayHabits.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {todayHabits.filter(h => h.completedToday).length}/{todayHabits.length}
                </span>
              )}
            </div>
            {todayHabits.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No habits tracked</p>
            ) : (
              <div className="space-y-2">
                {todayHabits.map((habit, i) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.04, ease }}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                      habit.completedToday
                        ? 'bg-emerald-400 text-white'
                        : 'bg-white/5 text-[var(--color-text-muted)]'
                    }`}>
                      {habit.completedToday ? <Check size={11} /> : habit.icon || '📌'}
                    </div>
                    <span className={`text-sm ${habit.completedToday ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                      {habit.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </BentoCard>

          {/* Reflection */}
          <BentoCard delay={0.4}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Sparkles size={15} className="text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Reflection</h3>
            </div>
            <textarea
              value={reflection}
              onChange={e => { setReflection(e.target.value); markDirty(); }}
              placeholder="How did today go? What would you do differently?"
              rows={3}
              className="w-full bg-white/[0.02] rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none focus:border-purple-500/30 resize-none transition-colors"
            />
          </BentoCard>

          {/* Notes */}
          <BentoCard delay={0.45}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Pencil size={15} className="text-pink-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Notes</h3>
            </div>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); markDirty(); }}
              placeholder="Quick notes, ideas, reminders..."
              rows={3}
              className="w-full bg-white/[0.02] rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none focus:border-purple-500/30 resize-none transition-colors"
            />
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
