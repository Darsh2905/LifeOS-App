import BentoCard from '../components/BentoCard';
import { getGreeting } from '../utils/helpers';
import { Sparkles } from 'lucide-react';

export default function GreetingWidget() {
  return (
    <BentoCard delay={0.05}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 60%, #ec4899))' }}
        >
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{getGreeting()}</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Ready to be productive today?
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
