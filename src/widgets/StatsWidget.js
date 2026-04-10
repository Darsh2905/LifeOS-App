import BentoCard from '../components/BentoCard';
import ProgressBar from '../components/ProgressBar';
import { useTasks } from '../context/TaskContext';
import { useTimer } from '../context/TimerContext';
import { CheckCircle2, Timer, TrendingUp } from 'lucide-react';

export default function StatsWidget() {
  const { completedToday, totalToday, completionRate } = useTasks();
  const { todaySessions } = useTimer();

  const stats = [
    { icon: CheckCircle2, label: 'Tasks Done', value: `${completedToday}/${totalToday}`, color: '#22c55e' },
    { icon: Timer, label: 'Focus Sessions', value: todaySessions, color: 'var(--accent-color)' },
    { icon: TrendingUp, label: 'Completion', value: `${completionRate}%`, color: '#f59e0b' },
  ];

  return (
    <BentoCard delay={0.2}>
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Today's Progress</h3>
      <div className="space-y-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <ProgressBar value={completionRate} />
      </div>
    </BentoCard>
  );
}
