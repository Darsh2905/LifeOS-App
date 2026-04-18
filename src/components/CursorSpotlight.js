import { useEffect, useRef, useState } from 'react';

export default function CursorSpotlight() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let running = false;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const tick = () => {
      const dx = tx - cx;
      const dy = ty - cy;
      cx += dx * 0.15;
      cy += dy * 0.15;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) setVisible(true);
      start();
    };
    const onLeave = () => setVisible(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [visible]);

  return (
    <div
      ref={ref}
      className="cursor-spotlight"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
