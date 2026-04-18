import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key) {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDisplay(key) {
  const d = parseKey(key);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Themed date picker. Value is "YYYY-MM-DD" (or empty). Renders a portaled
// month grid with direction-aware transitions, today highlight, and quick chips.
export default function DatePicker({
  value = '',
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  className = '',
  clearable = true,
  min,   // optional YYYY-MM-DD
  max,   // optional YYYY-MM-DD
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [anchor, setAnchor] = useState(() => {
    const base = parseKey(value) || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [direction, setDirection] = useState(0);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const measure = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelHeight = 340;
    const spaceBelow = window.innerHeight - r.bottom;
    const flipUp = spaceBelow < panelHeight && r.top > panelHeight;
    setRect({
      width: r.width,
      left: Math.max(8, Math.min(window.innerWidth - 320 - 8, r.left)),
      top: flipUp ? r.top - panelHeight - 6 : r.bottom + 6,
    });
  }, []);

  useLayoutEffect(() => { if (open) measure(); }, [open, measure]);
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => measure();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClickAway = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickAway);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickAway);
    };
  }, [open, measure]);

  useEffect(() => {
    if (open) {
      const base = parseKey(value) || new Date();
      setAnchor(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [open, value]);

  const cells = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(anchor.getFullYear(), anchor.getMonth(), 0).getDate();

    const arr = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, prevMonthDays - startOffset + 1 + i);
      arr.push({ date: d, muted: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({ date: new Date(anchor.getFullYear(), anchor.getMonth(), i), muted: false });
    }
    while (arr.length % 7 !== 0) {
      const last = arr[arr.length - 1].date;
      arr.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), muted: true });
    }
    return arr;
  }, [anchor]);

  const todayKey = fmtKey(new Date());
  const selectedKey = value || null;

  const isDisabled = (d) => {
    const k = fmtKey(d);
    if (min && k < min) return true;
    if (max && k > max) return true;
    return false;
  };

  const goPrev = () => { setDirection(-1); setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1)); };
  const goNext = () => { setDirection(1);  setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1)); };
  const pick = (d) => {
    onChange(fmtKey(d));
    setOpen(false);
  };
  const pickRelative = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    pick(d);
  };

  const display = value ? formatDisplay(value) : '';

  const panel = open && rect && (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        key="dp-panel"
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.2, ease }}
        style={{ position: 'fixed', top: rect.top, left: rect.left, width: 300, zIndex: 1000 }}
        className="rounded-2xl border border-[var(--color-border-hover)] bg-[var(--color-surface-elevated)] backdrop-blur-2xl shadow-[0_24px_60px_-10px_rgba(0,0,0,0.6)] overflow-hidden p-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-2">
          <motion.button
            type="button"
            whileHover={{ x: -1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goPrev}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </motion.button>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${anchor.getFullYear()}-${anchor.getMonth()}-h`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease }}
              className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight"
            >
              {MONTHS[anchor.getMonth()]}{' '}
              <span className="text-[var(--color-text-muted)] font-light">{anchor.getFullYear()}</span>
            </motion.p>
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={{ x: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goNext}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </motion.button>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Month body with direction-aware slide */}
        <div className="relative overflow-hidden" style={{ minHeight: 216 }}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={`${anchor.getFullYear()}-${anchor.getMonth()}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -18 }}
              transition={{ duration: 0.25, ease }}
              className="grid grid-cols-7 gap-0.5"
            >
              {cells.map(({ date, muted }, idx) => {
                const key = fmtKey(date);
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const dis = isDisabled(date);
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    disabled={dis}
                    onClick={() => !dis && pick(date)}
                    whileTap={{ scale: dis ? 1 : 0.9 }}
                    className={`
                      relative h-9 rounded-lg text-[12px] font-medium flex items-center justify-center transition-colors
                      ${muted ? 'opacity-30' : ''}
                      ${dis ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected
                        ? 'text-white bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/35'
                        : isToday
                          ? 'text-purple-300 ring-1 ring-purple-500/35 bg-purple-500/[0.06]'
                          : 'text-[var(--color-text-primary)] hover:bg-white/5'
                      }
                    `}
                  >
                    {date.getDate()}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick chips */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => pickRelative(0)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => pickRelative(1)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-[var(--color-text-secondary)] bg-white/5 hover:bg-white/10 border border-[var(--color-border)] transition-colors"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => pickRelative(7)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-[var(--color-text-secondary)] bg-white/5 hover:bg-white/10 border border-[var(--color-border)] transition-colors"
          >
            Next week
          </button>
          <div className="flex-1" />
          {clearable && value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-2 py-1 rounded-lg text-[10.5px] font-semibold text-[var(--color-text-muted)] hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        whileTap={{ scale: disabled ? 1 : 0.985 }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`
          group inline-flex items-center gap-2 w-full justify-between
          bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)]
          border border-[var(--color-border)] hover:border-[var(--color-border-hover)]
          text-[var(--color-text-primary)] font-medium
          h-[42px] px-3 text-sm rounded-xl transition-colors
          ${open ? 'border-purple-500/40 ring-1 ring-purple-500/25' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        <span className="shrink-0 text-[var(--color-text-muted)] group-hover:text-purple-300 transition-colors">
          <CalendarDays size={15} />
        </span>
        <span className={`flex-1 text-left truncate ${value ? '' : 'text-[var(--color-text-muted)] font-normal'}`}>
          {display || placeholder}
        </span>
        {clearable && value && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="shrink-0 p-0.5 rounded-md text-[var(--color-text-muted)] hover:text-red-300 hover:bg-red-500/10 transition-colors"
            aria-label="Clear date"
          >
            <X size={13} />
          </span>
        )}
      </motion.button>
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </>
  );
}
