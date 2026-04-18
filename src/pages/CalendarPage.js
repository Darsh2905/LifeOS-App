import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange, ChevronLeft, ChevronRight, RefreshCw, ExternalLink,
  MapPin, Clock, Link2, Loader2, CalendarCheck, AlertCircle,
} from 'lucide-react';
import { api } from '../utils/api';

const ease = [0.22, 1, 0.36, 1];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function NotConnectedState({ onConnect, connecting }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#141214]/80 via-[#171317]/80 to-[#1a1418]/80 backdrop-blur-2xl p-10 md:p-14"
    >
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col items-center text-center max-w-xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 ring-1 ring-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20"
        >
          <CalendarRange size={30} className="text-purple-300" />
        </motion.div>

        <h2 className="text-[28px] md:text-[32px] font-semibold text-white tracking-tight mb-2">
          Connect your Google Calendar
        </h2>
        <p className="text-[15px] text-white/60 leading-relaxed max-w-md mb-8">
          Sync your events, meetings and dated tasks into one beautiful view. Your calendar stays in Google — LifeOS just shows you the big picture.
        </p>

        <motion.button
          whileHover={{ y: -1, boxShadow: '0 14px 40px rgba(0,0,0,0.45)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onConnect}
          disabled={connecting}
          className="relative flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-[15px] font-semibold text-[#1f1f1f] bg-white hover:bg-[#f7f7f7] transition-colors border border-black/5 shadow-[0_4px_14px_rgba(0,0,0,0.35)] disabled:opacity-80 disabled:cursor-wait min-w-[260px]"
        >
          {connecting ? (
            <>
              <Loader2 size={18} className="animate-spin text-[#1f1f1f]" />
              <span>Opening Google…</span>
            </>
          ) : (
            <>
              <GoogleLogo className="w-[18px] h-[18px]" />
              <span>Connect Google Calendar</span>
            </>
          )}
        </motion.button>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          {[
            { title: 'Month view', body: 'See every meeting and task at a glance' },
            { title: 'Auto-sync', body: 'Dated tasks land on your calendar automatically' },
            { title: 'Private', body: 'Tokens are revocable anytime from Settings' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[12px] font-semibold text-white/85">{f.title}</p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-snug">{f.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[11px] text-white/35">
          You can also sign in with Google on the login screen — all data stays in your Google account.
        </p>
      </div>
    </motion.div>
  );
}

function MonthGrid({ anchor, events, selectedKey, onSelect }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(anchor.getFullYear(), anchor.getMonth(), 0).getDate();
  const todayKey = fmtDateKey(new Date());

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, prevMonthDays - startOffset + 1 + i);
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(anchor.getFullYear(), anchor.getMonth(), i), muted: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), muted: true });
  }

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
    <div className="rounded-3xl border border-white/10 bg-[#111013]/60 backdrop-blur-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
        {cells.map(({ date, muted }, idx) => {
          const key = fmtDateKey(date);
          const list = byDay.get(key) || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <motion.button
              key={idx}
              onClick={() => onSelect(key)}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
              transition={{ duration: 0.15 }}
              className={`relative text-left border-r border-b border-white/5 last:border-r-0 p-2 flex flex-col gap-1 focus:outline-none focus:ring-1 focus:ring-purple-500/40 ${muted ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[12px] font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday
                      ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                      : isSelected
                        ? 'bg-white/10 text-white'
                        : 'text-white/75'
                  }`}
                >
                  {date.getDate()}
                </span>
                {list.length > 3 && (
                  <span className="text-[10px] text-white/40 font-medium">+{list.length - 3}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {list.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[10.5px] leading-snug truncate px-1.5 py-0.5 rounded-md border ${
                      ev.allDay
                        ? 'bg-purple-500/15 border-purple-400/25 text-purple-100'
                        : 'bg-white/5 border-white/10 text-white/85'
                    }`}
                    title={ev.summary}
                  >
                    {!ev.allDay && (
                      <span className="text-white/50 mr-1">{fmtTime(parseEventTime(ev))}</span>
                    )}
                    {ev.summary}
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function DayRail({ selectedKey, events }) {
  const selected = useMemo(() => (
    selectedKey
      ? new Date(Number(selectedKey.slice(0, 4)), Number(selectedKey.slice(5, 7)) - 1, Number(selectedKey.slice(8, 10)))
      : new Date()
  ), [selectedKey]);

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
    <div className="rounded-3xl border border-white/10 bg-[#111013]/60 backdrop-blur-2xl p-4 h-fit sticky top-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {selected.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xl font-semibold text-white tracking-tight">
            {selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="text-[11px] text-white/40">{list.length} {list.length === 1 ? 'event' : 'events'}</span>
      </div>

      <AnimatePresence mode="popLayout">
        {list.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-10 text-white/35 text-sm"
          >
            Nothing scheduled.
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((ev) => {
              const t = parseEventTime(ev);
              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease }}
                  className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-purple-400 to-violet-500 opacity-80" />
                  <div className="pl-2">
                    <p className="text-[13px] font-semibold text-white/95 leading-snug line-clamp-2">{ev.summary}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {ev.allDay ? 'All day' : `${fmtTime(t)}${ev.end ? ` – ${fmtTime(new Date(ev.end))}` : ''}`}
                      </span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin size={11} /> {ev.location}
                        </span>
                      )}
                      {ev.source?.title === 'LifeOS' && (
                        <span className="inline-flex items-center gap-1 text-purple-300/80">
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
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CalendarPage() {
  const [status, setStatus] = useState({ connected: false, loading: true, email: null, configured: true });
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
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

  const goPrev = () => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1));
  const goNext = () => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1));
  const goToday = () => {
    const d = new Date();
    setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedKey(fmtDateKey(d));
  };

  if (status.loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300/80 mb-1">Calendar</p>
          <h1 className="text-[30px] sm:text-[34px] font-semibold text-white tracking-tight">
            {MONTHS[anchor.getMonth()]} <span className="text-white/45 font-light">{anchor.getFullYear()}</span>
          </h1>
          {status.connected && status.email && (
            <p className="text-[12px] text-white/45 mt-1 inline-flex items-center gap-1.5">
              <CalendarCheck size={12} className="text-emerald-400" />
              Synced with <span className="text-white/75">{status.email}</span>
            </p>
          )}
        </div>
        {status.connected && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="h-9 px-3 rounded-lg text-[12px] font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
              <button onClick={goPrev} className="h-9 w-9 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors" aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button onClick={goNext} className="h-9 w-9 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors" aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => loadEvents(anchor)}
              disabled={loadingEvents}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-60"
              aria-label="Refresh"
            >
              <RefreshCw size={14} className={loadingEvents ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </motion.div>

      {!status.connected ? (
        <NotConnectedState onConnect={connect} connecting={connecting} />
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[12px] text-red-300">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            <MonthGrid anchor={anchor} events={events} selectedKey={selectedKey} onSelect={setSelectedKey} />
            <DayRail selectedKey={selectedKey} events={events} />
          </div>
        </>
      )}
    </div>
  );
}
