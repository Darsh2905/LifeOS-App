import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocus } from '../context/FocusContext';
import { useTimer } from '../context/TimerContext';
import { formatTime } from '../utils/helpers';
import { Play, Pause, RotateCcw, X, Flame, Coffee, Settings2, Minus, Plus, CheckCircle2 } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const PRESETS = [
  { label: '15m', mins: 15 },
  { label: '25m', mins: 25 },
  { label: '45m', mins: 45 },
  { label: '60m', mins: 60 },
  { label: '90m', mins: 90 },
];

export default function FocusMode() {
  const { isFocusMode, focusTask, exitFocus } = useFocus();
  const {
    timeLeft, isRunning, isBreak,
    focusDuration, breakDuration, todaySessions,
    start, pause, reset, setCustomFocus, setCustomBreak,
  } = useTimer();
  const [showSettings, setShowSettings] = useState(false);
  const maxTime = isBreak ? breakDuration : focusDuration;
  const progress = timeLeft / maxTime;
  const circumference = 2 * Math.PI * 140;
  const focusMins = Math.round(focusDuration / 60);
  const breakMins = Math.round(breakDuration / 60);

  return (
    <AnimatePresence>
      {isFocusMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0a0a12] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Ambient aurora */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.2 }}
            className="absolute -top-60 -right-40 w-[560px] h-[560px] rounded-full bg-purple-500/10 blur-[140px] pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.3 }}
            className="absolute -bottom-60 -left-40 w-[560px] h-[560px] rounded-full bg-violet-500/10 blur-[140px] pointer-events-none"
          />

          {/* Top bar: customize + close */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease }}
            className="absolute top-5 left-5 right-5 flex items-center justify-between z-10"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings((v) => !v)}
              className={`flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12px] font-semibold border transition-all backdrop-blur-xl ${
                showSettings
                  ? 'text-purple-200 bg-purple-500/15 border-purple-500/30'
                  : 'text-white/55 bg-white/[0.04] border-white/10 hover:text-white/85 hover:bg-white/[0.08]'
              }`}
            >
              <Settings2 size={14} />
              Customize
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={exitFocus}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 text-white/50 hover:text-white/90 hover:bg-white/[0.08] flex items-center justify-center transition-colors backdrop-blur-xl"
              aria-label="Exit focus"
            >
              <X size={17} />
            </motion.button>
          </motion.div>

          {/* Customize slide-down panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.28, ease }}
                className="absolute top-[70px] left-1/2 -translate-x-1/2 w-[min(560px,calc(100vw-40px))] z-10 rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] p-5"
              >
                {/* Quick presets */}
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-white/40 mb-2.5 uppercase tracking-[0.18em]">
                    Quick Presets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => {
                      const isActive = focusMins === p.mins;
                      return (
                        <motion.button
                          key={p.mins}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCustomFocus(p.mins)}
                          className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                            isActive
                              ? 'text-white bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30'
                              : 'text-white/60 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/90 border border-white/10'
                          }`}
                        >
                          {p.label}
                          {isActive && (
                            <motion.span
                              layoutId="presetCheck"
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-md"
                              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            >
                              <CheckCircle2 size={10} className="text-purple-600" />
                            </motion.span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Focus duration */}
                  <div>
                    <p className="text-[10px] font-bold text-white/40 mb-2.5 uppercase tracking-[0.18em] flex items-center gap-1.5">
                      <Flame size={10} className="text-purple-400" /> Focus Duration
                    </p>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCustomFocus(Math.max(1, focusMins - 5))}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center text-white/60"
                      >
                        <Minus size={13} />
                      </motion.button>
                      <div className="flex-1 text-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={focusMins}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="inline-block text-xl font-bold text-white tracking-tight tabular-nums"
                          >
                            {focusMins}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-[11px] text-white/40 ml-1">min</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCustomFocus(focusMins + 5)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center text-white/60"
                      >
                        <Plus size={13} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Break duration */}
                  <div>
                    <p className="text-[10px] font-bold text-white/40 mb-2.5 uppercase tracking-[0.18em] flex items-center gap-1.5">
                      <Coffee size={10} className="text-emerald-400" /> Break Duration
                    </p>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCustomBreak(Math.max(1, breakMins - 1))}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center text-white/60"
                      >
                        <Minus size={13} />
                      </motion.button>
                      <div className="flex-1 text-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={breakMins}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="inline-block text-xl font-bold text-white tracking-tight tabular-nums"
                          >
                            {breakMins}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-[11px] text-white/40 ml-1">min</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCustomBreak(breakMins + 1)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center text-white/60"
                      >
                        <Plus size={13} />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {isRunning && (
                  <p className="mt-4 pt-3 border-t border-white/5 text-[10.5px] text-white/35 leading-relaxed">
                    Changes apply to the next session — reset the timer to use new durations now.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main display */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col items-center relative z-[1]"
          >
            <motion.p
              layout
              className="text-sm font-medium text-white/30 mb-2 uppercase tracking-[0.2em] flex items-center gap-2"
            >
              {isBreak ? <><Coffee size={16} /> Break</> : <><Flame size={16} /> Focus</>}
            </motion.p>

            {focusTask && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-semibold text-white/70 mb-10 max-w-md text-center"
              >
                {focusTask.title}
              </motion.h2>
            )}

            <div className="relative w-72 h-72 mb-12">
              <svg className="w-72 h-72 -rotate-90" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <motion.circle
                  cx="150" cy="150" r="140" fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: circumference * (1 - progress) }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl font-bold tracking-tight text-white tabular-nums">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-sm text-white/30 mt-3">
                  {isBreak ? 'Recharge' : 'Deep work'}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRunning ? pause : start}
                className="flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-semibold text-white shadow-lg shadow-purple-500/25"
                style={{ background: 'var(--accent-color)' }}
              >
                {isRunning ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Start</>}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl text-base font-medium bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                aria-label="Reset"
              >
                <RotateCcw size={20} />
              </motion.button>
            </div>

            {todaySessions > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-[11px] text-white/30 tracking-wide"
              >
                {todaySessions} {todaySessions === 1 ? 'session' : 'sessions'} completed today
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
