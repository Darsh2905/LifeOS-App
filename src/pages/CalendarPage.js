import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange, ChevronLeft, ChevronRight, RefreshCw, ExternalLink,
  MapPin, Clock, Link2, Loader2, CalendarCheck, AlertCircle, CheckCircle2, Sparkles,
} from 'lucide-react';
import BentoCard from '../components/BentoCard';
import { api } from '../utils/api';

const ease = [0.22, 1, 0.36, 1];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ─────────────────────────────  Helpers  ───────────────────────────── */

function GoogleLogo({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function fmtDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(key) {
  return new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function parseEventTime(ev) {
  const raw = ev.start;
  if (!raw) return null;
  if (ev.allDay) {
    const [y, m, d] = String(raw).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(raw);
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function startSignInWithGoogle() {
  const devBackend = window.location.port === '3000' ? 'http://localhost:5001' : '';
  window.location.href = `${devBackend}/api/calendar/signin`;
}

/* ──────────────────  Not-connected state (polished CTA)  ───────────────── */

function NotConnectedState({ onConnect, connecting }) {
  const perks = [
    { icon: CalendarCheck, title: 'Full month view', body: 'See every meeting and dated task at a glance' },
    { icon: Sparkles,      title: 'Auto-sync',       body: 'Tasks you date land on your calendar automatically' },
    { icon: CheckCircle2,  title: 'Stays yours',     body: 'Data lives in Google — revocable anytime from Settings' },
  ];

  return (
    <BentoCard delay={0.05} tilt={false} premium noPadding className="relative overflow-hidden">
      {/* Ambient aurora */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.1 }}
        className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none"
      />

      <div className="relative px-6 py-14 md:px-12 md:py-16 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease }}
          className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-6"
        >
          <span className="absolute inset-x-3 top-1 h-px bg-white/40 rounded-full" />
          <CalendarRange size={28} className="text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.55, ease }}
          className="text-[28px] md:text-[32px] font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight"
        >
          Connect your Google Calendar
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55, ease }}
          className="text-[14px] md:text-[15px] text-[var(--color-text-secondary)] leading-relaxed max-w-md mt-2"
        >
          Sync your events, meetings, and dated tasks into one beautiful view. Your calendar stays in Google — LifeOS just shows you the big picture.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.55, ease }}
          whileHover={{ y: -1, boxShadow: '0 18px 48px rgba(0,0,0,0.45)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onConnect}
          disabled={connecting}
          className="relative mt-7 flex items-center justify-center gap-3 h-[46px] px-6 rounded-xl text-[14px] font-semibold text-[#1f1f1f] bg-white hover:bg-[#f7f7f7] transition-colors border border-black/5 shadow-[0_4px_14px_rgba(0,0,0,0.35)] disabled:opacity-80 disabled:cursor-wait min-w-[240px]"
        >
          {connecting ? (
            <>
              <Loader2 size={17} className="animate-spin text-[#1f1f1f]" />
              <span>Opening Google…</span>
            </>
          ) : (
            <>
              <GoogleLogo className="w-[17px] h-[17px]" />
              <span>Connect Google Calendar</span>
            </>
          )}
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55, ease }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left"
        >
          {perks.map(({ icon: Icon, title, body }, idx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + idx * 0.05, ease }}
              className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-3"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/12 flex items-center justify-center mb-2">
                <Icon size={13} className="text-purple-300" />
              </div>
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{title}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </BentoCard>
  );
}

/* ────────────────────────────  Month grid  ──────────────────────────── */

function MonthGrid({ anchor, events, selectedKey, onSelect, direction }) {
  const todayKey = fmtDateKey(new Date());

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

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const t = parseEventTime(ev);
      if (!t) continue;
      const k = fmtDateKey(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.start) - new Date(b.start);
      });
    }
    return map;
  }, [events]);

  return (
    <BentoCard delay={0.1} tilt={false} noPadding>
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] text-center"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Month body — animates direction-aware slide */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={`${anchor.getFullYear()}-${anchor.getMonth()}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.35, ease }}
            className="grid grid-cols-7 auto-rows-[minmax(112px,1fr)]"
          >
            {cells.map(({ date, muted }, idx) => {
              const key = fmtDateKey(date);
              const list = byDay.get(key) || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const isLastRow = idx >= cells.length - 7;
              const isLastCol = (idx % 7) === 6;
              return (
                <motion.button
                  key={idx}
                  onClick={() => onSelect(key)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  transition={{ duration: 0.12 }}
                  className={`relative text-left p-2 flex flex-col gap-1 focus:outline-none focus:z-10 focus:ring-1 focus:ring-purple-500/50 transition-colors
                    ${isLastCol ? '' : 'border-r border-[var(--color-border)]'}
                    ${isLastRow ? '' : 'border-b border-[var(--color-border)]'}
                    ${muted ? 'opacity-35' : ''}
                    ${isSelected && !isToday ? 'bg-purple-500/[0.05]' : ''}
                  `}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="dayRing"
                      className="absolute inset-0 ring-1 ring-purple-500/45 rounded-[2px] pointer-events-none"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}

                  <div className="flex items-center justify-between relative z-[1]">
                    <span
                      className={`text-[12px] font-semibold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isToday
                          ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/35'
                          : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {list.length > 3 && (
                      <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">+{list.length - 3}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 overflow-hidden relative z-[1]">
                    {list.slice(0, 3).map((ev) => {
                      const fromTask = ev.source?.title === 'LifeOS' ||
                        ev.description?.toLowerCase?.().includes('lifeos task');
                      return (
                        <div
                          key={ev.id}
                          className={`group/chip text-[10.5px] leading-snug truncate px-1.5 py-0.5 rounded-md border flex items-center gap-1
                            ${fromTask
                              ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/15 border-purple-400/30 text-purple-100'
                              : ev.allDay
                                ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100'
                                : 'bg-white/[0.04] border-white/10 text-[var(--color-text-primary)]'
                            }`}
                          title={ev.summary}
                        >
                          {!ev.allDay && (
                            <span className="text-[var(--color-text-muted)] shrink-0">{fmtTime(parseEventTime(ev))}</span>
                          )}
                          <span className="truncate">{ev.summary}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </BentoCard>
  );
}

/* ──────────────────────────  Day rail  ────────────────────────── */

function DayRail({ selectedKey, events, loading }) {
  const selected = useMemo(() => parseDateKey(selectedKey), [selectedKey]);
  const isToday = fmtDateKey(new Date()) === selectedKey;

  const list = useMemo(() => {
    return events
      .filter((ev) => {
        const t = parseEventTime(ev);
        return t && fmtDateKey(t) === fmtDateKey(selected);
      })
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.start) - new Date(b.start);
      });
  }, [events, selected]);

  return (
    <BentoCard delay={0.15} tilt={false} className="h-fit lg:sticky lg:top-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {selected.toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10">
                Today
              </span>
            )}
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            {selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {list.length} {list.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="relative">
        <AnimatePresence mode="popLayout">
          {loading && list.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-10 text-[var(--color-text-muted)]"
            >
              <Loader2 size={16} className="animate-spin text-purple-400" />
            </motion.div>
          ) : list.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-10"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-center mb-3">
                <CalendarRange size={16} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Nothing scheduled</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Enjoy the open space.</p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              {list.map((ev, idx) => {
                const t = parseEventTime(ev);
                const fromTask = ev.source?.title === 'LifeOS' ||
                  ev.description?.toLowerCase?.().includes('lifeos task');
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: idx * 0.03, duration: 0.3, ease }}
                    className="group relative rounded-xl border border-[var(--color-border)] bg-white/[0.025] p-3 pl-4 hover:bg-white/[0.05] hover:border-[var(--color-border-hover)] transition-colors"
                  >
                    <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${fromTask
                      ? 'bg-gradient-to-b from-purple-400 to-violet-500'
                      : ev.allDay
                        ? 'bg-gradient-to-b from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-b from-sky-400 to-blue-500'
                    }`} />
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                      {ev.summary}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {ev.allDay ? 'All day' : `${fmtTime(t)}${ev.end ? ` – ${fmtTime(new Date(ev.end))}` : ''}`}
                      </span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin size={11} /> {ev.location}
                        </span>
                      )}
                      {fromTask && (
                        <span className="inline-flex items-center gap-1 text-purple-300/90">
                          <Link2 size={11} /> From task
                        </span>
                      )}
                    </div>
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        Open in Google <ExternalLink size={10} />
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BentoCard>
  );
}

/* ────────────────────────────  Page  ──────────────────────────── */

export default function CalendarPage() {
  const [status, setStatus] = useState({ connected: false, loading: true, email: null, configured: true });
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [direction, setDirection] = useState(0);
  const [selectedKey, setSelectedKey] = useState(() => fmtDateKey(new Date()));
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/calendar/status');
      setStatus({ connected: !!data.connected, loading: false, email: data.email || null, configured: data.configured !== false });
    } catch {
      setStatus({ connected: false, loading: false, email: null, configured: true });
    }
  }, []);

  const loadEvents = useCallback(async (anchorDate) => {
    setLoadingEvents(true);
    setError(null);
    try {
      const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 20).toISOString();
      const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 2, 10).toISOString();
      const data = await api.get(`/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e.message || 'Failed to load events.');
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (status.connected) loadEvents(anchor);
  }, [status.connected, anchor, loadEvents]);

  useEffect(() => {
    const handler = () => loadStatus().then(() => loadEvents(anchor));
    window.addEventListener('calendar:changed', handler);
    return () => window.removeEventListener('calendar:changed', handler);
  }, [anchor, loadEvents, loadStatus]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const data = await api.get('/calendar/connect');
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Unable to start Google flow.');
    } catch (e) {
      setConnecting(false);
      if (String(e.message || '').includes('401')) {
        startSignInWithGoogle();
        return;
      }
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { kind: 'error', title: 'Connection failed', message: e.message || 'Please try again.' },
      }));
    }
  }, []);

  const goPrev = () => { setDirection(-1); setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1)); };
  const goNext = () => { setDirection(1);  setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1)); };
  const goToday = () => {
    const d = new Date();
    setDirection(anchor.getTime() > new Date(d.getFullYear(), d.getMonth(), 1).getTime() ? -1 : 1);
    setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedKey(fmtDateKey(d));
  };

  if (status.loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — mirrors the DailyPlanner style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <CalendarRange size={20} className="text-white" />
            </div>
            Calendar
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 ml-[52px]">
            {status.connected
              ? 'Your Google Calendar, inside LifeOS'
              : 'Sync your schedule with Google Calendar'}
          </p>
          {status.connected && status.email && (
            <div className="ml-[52px] mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <GoogleLogo className="w-3 h-3" />
              <span className="text-[10.5px] font-semibold tracking-wide text-emerald-200/95">{status.email}</span>
            </div>
          )}
        </div>

        {status.connected && (
          <div className="flex items-center gap-2 ml-[52px] md:ml-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={goToday}
              className="h-9 px-3.5 rounded-xl text-[11.5px] font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 transition-colors"
            >
              Today
            </motion.button>
            <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] overflow-hidden">
              <motion.button
                whileHover={{ x: -1 }}
                whileTap={{ scale: 0.92 }}
                onClick={goPrev}
                className="h-9 w-9 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </motion.button>
              <div className="w-px h-5 bg-[var(--color-border)]" />
              <motion.button
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.92 }}
                onClick={goNext}
                className="h-9 w-9 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.06, rotate: 15 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => loadEvents(anchor)}
              disabled={loadingEvents}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] hover:bg-white/5 border border-[var(--color-border)] transition-colors disabled:opacity-60"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={14} className={loadingEvents ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        )}
      </motion.div>

      {!status.connected ? (
        <NotConnectedState onConnect={connect} connecting={connecting} />
      ) : (
        <>
          {/* Month title with soft divider */}
          <motion.div
            key={`${anchor.getFullYear()}-${anchor.getMonth()}-title`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="flex items-baseline gap-3"
          >
            <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)] tracking-tight">
              {MONTHS[anchor.getMonth()]}
              <span className="ml-2 text-[var(--color-text-muted)] font-light">{anchor.getFullYear()}</span>
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--color-border-hover)] via-[var(--color-border)] to-transparent" />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[12px] text-red-300"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
            <MonthGrid
              anchor={anchor}
              events={events}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              direction={direction}
            />
            <DayRail selectedKey={selectedKey} events={events} loading={loadingEvents} />
          </div>

          <p className="text-center text-[10.5px] text-[var(--color-text-muted)] pt-2">
            Events sync live from Google Calendar · Tasks with due dates appear as <span className="text-purple-300">purple</span> pills
          </p>
        </>
      )}
    </div>
  );
}
