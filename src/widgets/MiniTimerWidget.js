import { motion } from 'framer-motion';
import BentoCard from '../components/BentoCard';
import { useTimer } from '../context/TimerContext';
import { useFocus } from '../context/FocusContext';
import { formatTime } from '../utils/helpers';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function MiniTimerWidget() {
  const { timeLeft, isRunning, isBreak, focusDuration, breakDuration, start, pause, reset } = useTimer();
  const { enterFocus } = useFocus();
  const progress = timeLeft / (isBreak ? breakDuration : focusDuration);

  const handleStart = () => {
    enterFocus();
    start();
  };

  return (
    <BentoCard delay={0.25} className="flex flex-col items-center justify-center text-center">
      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
        {isBreak ? 'Break' : 'Focus'}
      </p>
      <div className="relative w-24 h-24 mb-3">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="42" fill="none" stroke="var(--color-glass-border)" strokeWidth="4" />
          <motion.circle
            cx="48" cy="48" r="42" fill="none"
            stroke="var(--accent-color)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={264}
            animate={{ strokeDashoffset: 264 * (1 - progress) }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[var(--color-text-primary)]">
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={isRunning ? pause : handleStart}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: 'var(--accent-color)' }}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={reset}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={16} />
        </motion.button>
      </div>
    </BentoCard>
  );
}
