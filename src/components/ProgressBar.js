import { motion } from 'framer-motion';

export default function ProgressBar({ value, max = 100, className = '' }) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={`w-full h-2 rounded-full bg-white/5 overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, white))` }}
      />
    </div>
  );
}
