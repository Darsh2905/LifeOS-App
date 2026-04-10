import { useState, useEffect } from 'react';
import BentoCard from '../components/BentoCard';
import { QUOTES } from '../utils/constants';
import { Quote } from 'lucide-react';

export default function QuoteWidget() {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    const idx = Math.floor(Math.random() * QUOTES.length);
    setQuote(QUOTES[idx]);
  }, []);

  return (
    <BentoCard delay={0.15}>
      <Quote size={18} className="text-[var(--color-text-muted)] mb-2" />
      <p className="text-sm text-[var(--color-text-primary)] italic leading-relaxed">
        "{quote.text}"
      </p>
      <p className="text-xs text-[var(--color-text-muted)] mt-2">— {quote.author}</p>
    </BentoCard>
  );
}
