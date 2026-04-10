import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BentoCard from '../components/BentoCard';
import { useTimer } from '../context/TimerContext';
import { formatTime } from '../utils/helpers';
import { Play, Pause, RotateCcw, Coffee, Flame, Minus, Plus, Clock } from 'lucide-react';

const PRESETS = [
  { label: '5m', mins: 5 },
  { label: '15m', mins: 15 },
  { label: '25m', mins: 25 },
  { label: '45m', mins: 45 },
  { label: '60m', mins: 60 },
  { label: '90m', mins: 90 },
];

export default function TimerPage() {
  const {
    timeLeft, isRunning, isBreak, todaySessions, sessions,
    focusDuration, breakDuration,
    start, pause, reset, setCustomFocus, setCustomBreak,
  } = useTimer();
  const maxTime = isBreak ? breakDuration : focusDuration;
  const progress = timeLeft / maxTime;
  const circumference = 2 * Math.PI * 140;
  const focusMins = Math.round(focusDuration / 60);
  const breakMins = Math.round(breakDuration / 60);
  const [showSettings, setShowSettings] = useState(false);
  const [focusInput, setFocusInput] = useState(String(focusMins));
  const [breakInput, setBreakInput] = useState(String(breakMins));

  useEffect(() => {
    setFocusInput(String(focusMins));
  }, [focusMins]);

  useEffect(() => {
    setBreakInput(String(breakMins));
  }, [breakMins]);

  const applyFocusInput = () => {
    const value = Number(focusInput);
    if (!Number.isFinite(value) || value < 1) {
      setFocusInput(String(focusMins));
      return;
    }
    setCustomFocus(value);
  };

  const applyBreakInput = () => {
    const value = Number(breakInput);
    if (!Number.isFinite(value) || value < 1) {
      setBreakInput(String(breakMins));
      return;
    }
    setCustomBreak(value);
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), count: sessions[key] || 0 };
  });

  const maxSessions = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Timer</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            showSettings ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10'
          }`}
        >
          <Clock size={15} /> Customize
        </motion.button>
      </div>

      {/* Duration Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <BentoCard delay={0}>
            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Quick Presets</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESETS.map(p => (
                    <motion.button
                      key={p.mins}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setCustomFocus(p.mins)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        focusMins === p.mins
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Focus Duration */}
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Focus Duration</p>
                  <div className="flex items-center gap-3 mb-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setCustomFocus(Math.max(1, focusMins - 5))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--color-text-secondary)]"
                    >
                      <Minus size={14} />
                    </motion.button>
                    <span className="text-lg font-bold text-[var(--color-text-primary)] w-14 text-center">{focusMins}m</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setCustomFocus(focusMins + 5)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--color-text-secondary)]"
                    >
                      <Plus size={14} />
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={focusInput}
                      onChange={e => setFocusInput(e.target.value)}
                      onBlur={applyFocusInput}
                      onKeyDown={e => { if (e.key === 'Enter') applyFocusInput(); }}
                      type="number"
                      min="1"
                      step="1"
                      className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-dark)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">minutes</span>
                  </div>
                </div>

                {/* Break Duration */}
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Break Duration</p>
                  <div className="flex items-center gap-3 mb-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setCustomBreak(Math.max(1, breakMins - 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--color-text-secondary)]"
                    >
                      <Minus size={14} />
                    </motion.button>
                    <span className="text-lg font-bold text-[var(--color-text-primary)] w-14 text-center">{breakMins}m</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setCustomBreak(breakMins + 1)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--color-text-secondary)]"
                    >
                      <Plus size={14} />
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={breakInput}
                      onChange={e => setBreakInput(e.target.value)}
                      onBlur={applyBreakInput}
                      onKeyDown={e => { if (e.key === 'Enter') applyBreakInput(); }}
                      type="number"
                      min="1"
                      step="1"
                      className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-dark)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--accent-color)]"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </BentoCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BentoCard delay={0.1} className="lg:col-span-2 flex flex-col items-center justify-center py-10">
          <p className="text-sm font-medium text-[var(--color-text-muted)] mb-6 uppercase tracking-widest flex items-center gap-2">
            {isBreak ? <><Coffee size={16} /> Break Time</> : <><Flame size={16} /> Focus Session</>}
          </p>

          <div className="relative w-72 h-72 mb-8">
            <svg className="w-72 h-72 -rotate-90" viewBox="0 0 300 300">
              <circle cx="150" cy="150" r="140" fill="none" stroke="var(--color-glass-border)" strokeWidth="6" />
              <motion.circle
                cx="150" cy="150" r="140" fill="none"
                stroke="var(--accent-color)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: circumference * (1 - progress) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)] mt-2">
                {isBreak ? 'Take a break' : 'Stay focused'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRunning ? pause : start}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-lg"
              style={{ background: 'var(--accent-color)' }}
            >
              {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={18} /> Reset
            </motion.button>
          </div>
        </BentoCard>

        <div className="space-y-5">
          <BentoCard delay={0.15}>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Today's Sessions</h3>
            <div className="text-4xl font-bold text-[var(--color-text-primary)]">{todaySessions}</div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {todaySessions * focusMins} minutes focused
            </p>
          </BentoCard>

          <BentoCard delay={0.2}>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">This Week</h3>
            <div className="flex items-end justify-between gap-2 h-32">
              {last7Days.map(({ day, count }) => (
                <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / maxSessions) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full min-h-[4px] rounded-full"
                    style={{ background: count > 0 ? 'var(--accent-color)' : 'var(--color-glass-border)' }}
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)]">{day}</span>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </div>
    </motion.div>
  );
}
