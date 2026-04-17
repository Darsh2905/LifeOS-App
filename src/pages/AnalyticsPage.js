import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import BentoCard from '../components/BentoCard';
import { useTasks } from '../context/TaskContext';
import { useTimer } from '../context/TimerContext';
import { useFinance } from '../context/FinanceContext';
import { TASK_STATES } from '../utils/constants';
import { formatRupees } from '../utils/helpers';
import { api } from '../utils/api';
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Target, Wallet, Brain, Sparkles, Activity, Loader2 } from 'lucide-react';

const CHART_COLORS = ['var(--accent-color)', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function formatCompactRupees(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return formatRupees(amount);
}

function CustomTooltip({ active, payload, label, valueFormatter = value => value }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-glass-border)] shadow-xl">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name ? `${p.name}: ` : ''}{valueFormatter(p.value, p)}
        </p>
      ))}
    </div>
  );
}

/* ── Productivity Trends (server-side) ── */
function ProductivityTrends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);

  useEffect(() => {
    setLoading(true);
    api.get(`/insights/trends?range=${range}`)
      .then(data => setTrends(data.trends || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <BentoCard delay={0.7}>
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-purple-400" />
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard delay={0.7}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Productivity Score Trend</h3>
        <div className="flex items-center gap-1">
          {[7, 14, 30].map(r => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                range === r ? 'bg-purple-500/15 text-purple-300' : 'text-[var(--color-text-muted)] hover:bg-white/5'
              }`}
            >
              {r}d
            </motion.button>
          ))}
        </div>
      </div>
      {trends.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trends}>
            <defs>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
              tickFormatter={d => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
              interval={Math.max(0, Math.floor(trends.length / 7) - 1)}
            />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-glass-border)] shadow-xl">
                  <p className="text-xs text-[var(--color-text-muted)]">{d.date}</p>
                  <p className="text-sm font-bold text-purple-400">{d.productivityScore}/100</p>
                  {d.mood && <p className="text-xs">{d.mood} mood</p>}
                  {d.habitRate > 0 && <p className="text-[10px] text-[var(--color-text-muted)]">{d.habitRate}% habits</p>}
                </div>
              );
            }} />
            <Area type="monotone" dataKey="productivityScore" stroke="#8b5cf6" fill="url(#prodGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No trend data available</p>
      )}
    </BentoCard>
  );
}

/* ── AI Mood & Productivity Insights ── */
function AIMoodInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(() => {
    setLoading(true);
    api.get('/ai/mood-insights')
      .then(data => setInsights(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const confidenceColors = {
    high: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
    medium: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
    low: 'text-[var(--color-text-muted)] bg-white/5 ring-[var(--color-border)]',
  };

  return (
    <BentoCard delay={0.75}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-purple-400" />
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">AI Mood & Productivity Insights</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? 'Analyzing...' : insights ? 'Refresh' : 'Generate Insights'}
        </motion.button>
      </div>

      {!insights && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity size={28} className="text-purple-400/30 mb-2" />
          <p className="text-xs text-[var(--color-text-muted)]">Click "Generate Insights" to analyze correlations between your mood, productivity, exercise, and sleep.</p>
        </div>
      )}

      {insights && (
        <div className="space-y-3">
          {(insights.dataPoints || insights.rawCorrelations) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Correlations</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{Object.keys(insights.rawCorrelations || {}).length}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Mood Logs</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{insights.dataPoints?.journalDays || 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Sleep Logs</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{insights.dataPoints?.sleepDays || 0}</p>
              </div>
            </div>
          )}
          {insights.overallTrend && (
            <div className="p-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/10">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{insights.overallTrend}</p>
            </div>
          )}
          {(insights.insights || []).map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={11} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">{insight.title}</span>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ${confidenceColors[insight.confidence] || confidenceColors.low}`}>
                    {insight.confidence}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{insight.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}

/* ── Weekly Score Card ── */
function WeeklyScoreCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/insights/weekly')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const deltaColor = data.delta > 0 ? 'text-emerald-400' : data.delta < 0 ? 'text-red-400' : 'text-[var(--color-text-muted)]';
  const DeltaIcon = data.delta >= 0 ? TrendingUp : TrendingDown;

  return (
    <BentoCard delay={0.72}>
      <div className="flex items-center gap-2 mb-3">
        <Activity size={15} className="text-purple-400" />
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">This Week's Score</h3>
      </div>
      <div className="flex items-end gap-4 mb-3">
        <span className="text-4xl font-bold text-[var(--color-text-primary)]">{data.avgProductivityScore}</span>
        <span className="text-xs text-[var(--color-text-muted)] mb-1">/100 avg</span>
        <span className={`flex items-center gap-1 text-xs font-semibold ${deltaColor} mb-1 ml-auto`}>
          <DeltaIcon size={12} />
          {data.delta > 0 ? '+' : ''}{data.delta} vs last week
        </span>
      </div>
      {/* Mini daily bars */}
      <div className="flex items-end gap-1.5 h-16">
        {(data.dailyScores || []).map((day, i) => {
          const pct = Math.max(day.score, 3);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                className="w-full rounded-t-md"
                style={{ background: day.score >= 70 ? '#22c55e' : day.score >= 40 ? '#f59e0b' : '#ef4444', minHeight: 3 }}
              />
              <span className="text-[8px] text-[var(--color-text-muted)]">
                {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
              </span>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}

export default function AnalyticsPage() {
  const { tasks, completedToday, todayTasks } = useTasks();
  const { sessions, todaySessions } = useTimer();
  const {
    monthlyIncome, monthlyExpenses, balance,
    expensesByCategory, monthlyTrend, budget,
  } = useFinance();

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const dayTasks = tasks.filter(t => t.createdAt === key);
    const completed = dayTasks.filter(t => t.status === TASK_STATES.DONE).length;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: completed,
      sessions: sessions[key] || 0,
    };
  });

  const statusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === TASK_STATES.TODO).length },
    { name: 'In Progress', value: tasks.filter(t => t.status === TASK_STATES.IN_PROGRESS).length },
    { name: 'Done', value: tasks.filter(t => t.status === TASK_STATES.DONE).length },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length },
  ].filter(d => d.value > 0);

  const totalFocusMinutes = Object.values(sessions).reduce((a, b) => a + b, 0) * 25;
  const savingsRate = monthlyIncome > 0 ? Math.round((balance / monthlyIncome) * 100) : 0;
  const budgetUsedPct = budget > 0 ? Math.min(Math.round((monthlyExpenses / budget) * 100), 999) : 0;
  const financeTrendData = monthlyTrend.map(month => ({
    ...month,
    net: month.income - month.expenses,
  }));
  const hasFinanceData = monthlyIncome > 0 || monthlyExpenses > 0 || monthlyTrend.some(month => month.income > 0 || month.expenses > 0);

  const summaryCards = [
    { icon: CheckCircle2, label: 'Completed Today', value: completedToday, color: '#22c55e' },
    { icon: Clock, label: 'Focus Sessions', value: todaySessions, color: 'var(--accent-color)' },
    { icon: Target, label: 'Today\'s Tasks', value: todayTasks.length, color: '#f59e0b' },
    { icon: TrendingUp, label: 'Total Focus Time', value: `${totalFocusMinutes}m`, color: '#8b5cf6' },
  ];

  const financeCards = [
    { icon: Wallet, label: 'Net This Month', value: `${balance >= 0 ? '+' : '-'}${formatRupees(Math.abs(balance))}`, color: balance >= 0 ? '#22c55e' : '#ef4444' },
    { icon: TrendingUp, label: 'Savings Rate', value: monthlyIncome > 0 ? `${savingsRate}%` : 'No income', color: savingsRate >= 20 ? '#22c55e' : savingsRate >= 0 ? '#f59e0b' : '#ef4444' },
    { icon: TrendingDown, label: 'Monthly Spend', value: formatRupees(monthlyExpenses), color: '#ef4444' },
    { icon: Target, label: 'Budget Used', value: budget > 0 ? `${budgetUsedPct}%` : 'No budget', color: budget > 0 && budgetUsedPct > 100 ? '#ef4444' : '#8b5cf6' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ icon: Icon, label, value, color }, i) => (
          <BentoCard key={label} delay={0.05 + i * 0.05}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BentoCard delay={0.2}>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Tasks Completed (7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="tasks" stroke="var(--accent-color)" fill="url(#taskGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </BentoCard>

        <BentoCard delay={0.25}>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Focus Sessions (7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7Days}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" fill="var(--accent-color)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </BentoCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BentoCard delay={0.3}>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Task Status</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-[var(--color-text-secondary)]">{d.name}</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No task data yet</p>
          )}
        </BentoCard>

        <BentoCard delay={0.35}>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Priority Breakdown</h3>
          {priorityData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {priorityData.map((_, i) => (
                      <Cell key={i} fill={['#ef4444', '#f59e0b', '#22c55e'][i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {priorityData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ['#ef4444', '#f59e0b', '#22c55e'][i] }} />
                    <span className="text-xs text-[var(--color-text-secondary)]">{d.name}</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No task data yet</p>
          )}
        </BentoCard>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-0.5 bg-purple-500 rounded-full" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Finance Health</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {financeCards.map(({ icon: Icon, label, value, color }, i) => (
            <BentoCard key={label} delay={0.4 + i * 0.05}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)] truncate">{value}</p>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <BentoCard className="lg:col-span-2" delay={0.6}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Income vs Expenses (6 Months)</h3>
              {hasFinanceData && (
                <span className={`text-xs font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {balance >= 0 ? 'Positive net' : 'Negative net'}
                </span>
              )}
            </div>
            {hasFinanceData ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={financeTrendData} barGap={4}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={formatCompactRupees} width={64} />
                  <Tooltip content={<CustomTooltip valueFormatter={formatRupees} />} cursor={{ fill: 'rgba(147,51,234,0.05)', radius: 6 }} />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={28} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-sm text-[var(--color-text-muted)]">No finance data yet</p>
              </div>
            )}
          </BentoCard>

          <BentoCard delay={0.65}>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Top Spending Categories</h3>
            {expensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 5).map(cat => {
                  const pct = monthlyExpenses > 0 ? Math.round((cat.amount / monthlyExpenses) * 100) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{cat.label}</span>
                        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{formatRupees(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.7, duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ background: cat.color }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{pct}% of monthly spend</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-sm text-[var(--color-text-muted)]">No expenses yet</p>
              </div>
            )}
          </BentoCard>
        </div>
      </div>

      {/* ── Wellness & Productivity Intelligence ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-0.5 bg-purple-500 rounded-full" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Wellness & Productivity Intelligence</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-2">
            <ProductivityTrends />
          </div>
          <WeeklyScoreCard />
        </div>

        <AIMoodInsights />
      </div>
    </motion.div>
  );
}
