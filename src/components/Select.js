import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

// A themed dropdown that replaces native <select>. Panel is portaled so it
// escapes modal/overflow containers, and repositions on scroll/resize.
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  size = 'md',          // 'sm' | 'md'
  className = '',
  panelWidth,           // optional: force panel width. defaults to trigger width.
  align = 'left',       // 'left' | 'right'
  disabled = false,
  renderValue,          // optional: (option) => ReactNode for the trigger label
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;

  const measure = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom, bottom: window.innerHeight - r.top, left: r.left, right: window.innerWidth - r.right, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => measure();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(options.length - 1, h + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      }
      if (e.key === 'Enter' && highlight >= 0) {
        e.preventDefault();
        const opt = options[highlight];
        if (opt) { onChange(opt.value); setOpen(false); }
      }
    };
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
  }, [open, highlight, options, onChange, measure]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  const sizeClasses = size === 'sm'
    ? 'h-8 px-2.5 text-[11.5px] rounded-lg'
    : 'h-[42px] px-3 text-sm rounded-xl';

  const handlePick = (v) => {
    onChange(v);
    setOpen(false);
  };

  const panel = open && rect && (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        key="panel"
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.18, ease }}
        style={{
          position: 'fixed',
          top: rect.top + 6,
          left: align === 'right' ? undefined : rect.left,
          right: align === 'right' ? rect.right : undefined,
          width: panelWidth || Math.max(rect.width, 180),
          zIndex: 1000,
        }}
        className="rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface-elevated)] backdrop-blur-2xl shadow-[0_24px_60px_-10px_rgba(0,0,0,0.55)] overflow-hidden"
        role="listbox"
      >
        <div className="max-h-[260px] overflow-y-auto py-1">
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHi = i === highlight;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => handlePick(opt.value)}
                role="option"
                aria-selected={isSelected}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left text-[13px] transition-colors
                  ${isHi ? 'bg-purple-500/15' : 'bg-transparent'}
                  ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}
                  hover:text-[var(--color-text-primary)]`}
              >
                {opt.icon && (
                  <span className="shrink-0 w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)]">
                    {opt.icon}
                  </span>
                )}
                {opt.dot && (
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: opt.dot }} />
                )}
                <span className="flex-1 truncate">{opt.label}</span>
                {isSelected && <Check size={13} className="text-purple-300 shrink-0" />}
              </button>
            );
          })}
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`
          group inline-flex items-center gap-2 w-full justify-between
          bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)]
          border border-[var(--color-border)] hover:border-[var(--color-border-hover)]
          text-[var(--color-text-primary)] font-medium
          transition-colors ${sizeClasses}
          ${open ? 'border-purple-500/40 ring-1 ring-purple-500/25' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        <span className="flex-1 flex items-center gap-2 min-w-0 text-left truncate">
          {renderValue && selected
            ? renderValue(selected)
            : selected ? (
              <>
                {selected.dot && (
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: selected.dot }} />
                )}
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              <span className="text-[var(--color-text-muted)]">{placeholder}</span>
            )}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease }}
          className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]"
        >
          <ChevronDown size={size === 'sm' ? 13 : 15} />
        </motion.span>
      </motion.button>
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </>
  );
}
