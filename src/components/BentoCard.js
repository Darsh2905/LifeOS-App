import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function BentoCard({
  children,
  className = '',
  delay = 0,
  noPadding = false,
  tilt = true,
  glass = true,
  premium = false,
}) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 180, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-3, 3]), { stiffness: 180, damping: 20 });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mx.set(px);
    my.set(py);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  };

  const handleLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={tilt ? handleMove : undefined}
      onMouseLeave={tilt ? handleLeave : undefined}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1000 } : undefined}
      className={`
        magnetic-card card-hover shimmer-border
        rounded-2xl border border-[var(--color-border)]
        ${premium ? 'glass-premium' : glass ? 'glass-card' : 'bg-[var(--color-surface-card)]'}
        ${noPadding ? '' : 'p-5'}
        ${className}
      `}
    >
      <div style={{ transform: 'translateZ(0)' }}>{children}</div>
    </motion.div>
  );
}
