import { motion } from 'framer-motion';

export default function BentoCard({ children, className = '', delay = 0, noPadding = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: '0 20px 50px rgba(0,0,0,0.25), 0 0 20px rgba(147,51,234,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      className={`
        rounded-2xl border border-[var(--color-border)]
        bg-[var(--color-surface-card)] backdrop-blur-sm
        shadow-lg shadow-black/5
        transition-all duration-300
        ${noPadding ? '' : 'p-5'}
        ${className}
      `}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
    >
      {children}
    </motion.div>
  );
}
