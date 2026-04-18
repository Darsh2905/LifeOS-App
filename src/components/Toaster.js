import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const KIND_META = {
  success: { Icon: CheckCircle2, ring: 'ring-emerald-500/30', bg: 'from-emerald-500/15 to-emerald-500/5', text: 'text-emerald-300' },
  error:   { Icon: AlertCircle,  ring: 'ring-red-500/30',     bg: 'from-red-500/15 to-red-500/5',         text: 'text-red-300' },
  info:    { Icon: Info,         ring: 'ring-purple-500/30',  bg: 'from-purple-500/15 to-violet-500/5',   text: 'text-purple-300' },
};

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const { kind = 'info', title, message, duration = 4000 } = e.detail || {};
      const id = Math.random().toString(36).slice(2);
      setToasts(list => [...list, { id, kind, title, message }]);
      setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), duration);
    };
    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, []);

  const dismiss = (id) => setToasts(list => list.filter(t => t.id !== id));

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const { Icon, ring, bg, text } = KIND_META[t.kind] || KIND_META.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={`pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm rounded-2xl p-3.5 backdrop-blur-2xl ring-1 ${ring} bg-gradient-to-br ${bg} border border-white/5 shadow-2xl shadow-black/40`}
            >
              <div className={`mt-0.5 ${text}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold text-white leading-tight">{t.title}</p>}
                {t.message && <p className="text-xs text-white/70 mt-0.5 leading-snug">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
