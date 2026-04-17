import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Shield, Users, UserCheck, UserX, Search, Trash2, MoreHorizontal,
  ShieldCheck, ShieldOff, Ban, Check, TrendingUp, AlertCircle, Mail, Clock,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'purple', sub }) {
  const tones = {
    purple: 'from-purple-500/20 to-violet-500/5 text-purple-300 ring-purple-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-300 ring-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-300 ring-amber-500/20',
    rose: 'from-rose-500/20 to-pink-500/5 text-rose-300 ring-rose-500/20',
    sky: 'from-sky-500/20 to-blue-500/5 text-sky-300 ring-sky-500/20',
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl bg-gradient-to-br ${tones[tone]} ring-1 backdrop-blur-xl p-4`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{sub}</div> : null}
    </motion.div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Sparkline({ data, width = 140, height = 32 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.n), 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => `${(i * step).toFixed(1)},${(height - (d.n / max) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="url(#gg)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
      <defs>
        <linearGradient id="gg" x1="0" x2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Avatar({ name, role }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className="relative">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg shadow-purple-500/20">
        {initial}
      </div>
      {role === 'admin' && (
        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-[var(--color-surface-dark)]">
          <ShieldCheck size={9} className="text-white" />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([api.get('/admin/users'), api.get('/admin/stats')]);
      setUsers(list);
      setStats(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [users, query, statusFilter, roleFilter]);

  const toggleSuspend = async (u) => {
    const next = u.status === 'active' ? 'suspended' : 'active';
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/status`, { status: next });
      setUsers(list => list.map(x => x.id === u.id ? { ...x, status: next } : x));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleAdmin = async (u) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: next });
      setUsers(list => list.map(x => x.id === u.id ? { ...x, role: next } : x));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This permanently removes all their data and cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers(list => list.filter(x => x.id !== u.id));
      if (selected?.id === u.id) setSelected(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] glass-card p-7">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/20 to-rose-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 shadow-xl shadow-amber-500/30"
            >
              <Shield size={24} className="text-white" />
            </motion.div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Admin</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Manage users, monitor activity, and keep your instance healthy.</p>
            </div>
            {stats?.signups?.length > 0 && (
              <div className="hidden md:block">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Signups · 14d</div>
                <Sparkline data={stats.signups} />
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {stats && (
        <Reveal delay={0.05}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard icon={Users} tone="purple" label="Users" value={stats.totals.users} sub={`${stats.totals.admins} admins`} />
            <StatCard icon={UserCheck} tone="emerald" label="Active · 7d" value={stats.totals.activeWeek} />
            <StatCard icon={TrendingUp} tone="sky" label="New · 7d" value={stats.totals.newWeek} />
            <StatCard icon={UserX} tone="rose" label="Suspended" value={stats.totals.suspended} />
            <StatCard icon={AlertCircle} tone="amber" label="Total records" value={(stats.totals.tasks || 0) + (stats.totals.notes || 0) + (stats.totals.transactions || 0)} sub="tasks + notes + tx" />
          </div>
        </Reveal>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <Reveal delay={0.1}>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border)] glass-card p-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl bg-white/[0.03] border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/50 outline-none focus:border-purple-500/40"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="rounded-xl bg-white/[0.03] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl bg-white/[0.03] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] glass-card">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[var(--color-surface-elevated)]/50 border-b border-[var(--color-border)] text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role · Status</div>
            <div className="col-span-2">Last login</div>
            <div className="col-span-1 text-center">Records</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">No users match your filters.</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((u, i) => {
                const total = Object.values(u.counts || {}).reduce((s, n) => s + (n || 0), 0);
                const isMe = u.id === me?.id;
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-[var(--color-border)] last:border-b-0 group hover:bg-white/[0.02]"
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <Avatar name={u.name} role={u.role} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{u.name}</span>
                          {isMe && <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-purple-300">you</span>}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]"><Mail size={10} /><span className="truncate">{u.email}</span></div>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${u.role === 'admin' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-[var(--color-text-muted)]'}`}>
                        {u.role === 'admin' ? <ShieldCheck size={10} /> : null}
                        {u.role}
                      </span>
                      <span className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${u.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} /> {u.status}
                      </span>
                    </div>
                    <div className="col-span-2 text-[11px] text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1"><Clock size={10} />{fmtDate(u.last_login_at)}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{u.login_count || 0} logins</div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{total}</span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-1">
                      <motion.button whileTap={{ scale: 0.94 }} onClick={() => setSelected(u)}
                        title="Details"
                        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-primary)]">
                        <MoreHorizontal size={15} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }} disabled={busyId === u.id || isMe}
                        onClick={() => toggleAdmin(u)}
                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30">
                        {u.role === 'admin' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }} disabled={busyId === u.id || isMe}
                        onClick={() => toggleSuspend(u)}
                        title={u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30">
                        {u.status === 'active' ? <Ban size={15} /> : <Check size={15} />}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }} disabled={busyId === u.id || isMe}
                        onClick={() => removeUser(u)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30">
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </Reveal>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl border border-[var(--color-border)] glass-card p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} role={selected.role} />
                <div>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">{selected.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{selected.email}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Joined</div>
                  <div className="text-[var(--color-text-primary)]">{fmtDate(selected.created_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Last login</div>
                  <div className="text-[var(--color-text-primary)]">{fmtDate(selected.last_login_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Last IP</div>
                  <div className="text-[var(--color-text-primary)]">{selected.last_login_ip || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Total logins</div>
                  <div className="text-[var(--color-text-primary)]">{selected.login_count || 0}</div>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Data records</div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(selected.counts || {}).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3 py-2">
                      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">{k}</div>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{v}</div>
                    </div>
                  ))}
                  {Object.keys(selected.counts || {}).length === 0 && (
                    <div className="col-span-3 text-xs text-[var(--color-text-muted)]">No records yet.</div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelected(null)} className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-white/5">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
