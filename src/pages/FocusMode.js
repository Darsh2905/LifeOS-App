import { motion, AnimatePresence } from 'framer-motion';
import { useFocus } from '../context/FocusContext';
import { useTimer } from '../context/TimerContext';
import { formatTime } from '../utils/helpers';
import { Play, Pause, RotateCcw, X, Flame, Coffee } from 'lucide-react';

export default function FocusMode() {
  const { isFocusMode, focusTask, exitFocus } = useFocus();
  const { timeLeft, isRunning, isBreak, focusDuration, breakDuration, start, pause, reset } = useTimer();
  const maxTime = isBreak ? breakDuration : focusDuration;
  const progress = timeLeft / maxTime;
  const circumference = 2 * Math.PI * 140;

  return (
    <AnimatePresence>
      {isFocusMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0a0a12] flex flex-col items-center justify-center"
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={exitFocus}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <p className="text-sm font-medium text-white/30 mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
              {isBreak ? <><Coffee size={16} /> Break</> : <><Flame size={16} /> Focus</>}
            </p>

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
                <span className="text-7xl font-bold tracking-tight text-white">
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
                className="flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-semibold text-white"
                style={{ background: 'var(--accent-color)' }}
              >
                {isRunning ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Start</>}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl text-base font-medium bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={20} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
