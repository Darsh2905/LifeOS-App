import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import BentoCard from '../components/BentoCard';
import { useTasks } from '../context/TaskContext';
import { useTimer } from '../context/TimerContext';
import { TASK_STATES } from '../utils/constants';
import { TrendingUp, CheckCircle2, Clock, Target } from 'lucide-react';

const CHART_COLORS = ['var(--accent-color)', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-glass-border)] shadow-xl">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.value}</p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { tasks, completedToday, todayTasks } = useTasks();
  const { sessions, todaySessions } = useTimer();

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

  const summaryCards = [
    { icon: CheckCircle2, label: 'Completed Today', value: completedToday, color: '#22c55e' },
    { icon: Clock, label: 'Focus Sessions', value: todaySessions, color: 'var(--accent-color)' },
    { icon: Target, label: 'Today\'s Tasks', value: todayTasks.length, color: '#f59e0b' },
    { icon: TrendingUp, label: 'Total Focus Time', value: `${totalFocusMinutes}m`, color: '#8b5cf6' },
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
    </motion.div>
  );
}
