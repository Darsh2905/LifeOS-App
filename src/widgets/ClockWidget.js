import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BentoCard from '../components/BentoCard';

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <BentoCard className="flex flex-col items-center justify-center text-center" delay={0.1}>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={hours + minutes}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)]"
        >
          {hours}:{minutes}
        </motion.span>
        <span className="text-lg text-[var(--color-text-muted)]">{seconds}</span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1">{dateStr}</p>
    </BentoCard>
  );
}
