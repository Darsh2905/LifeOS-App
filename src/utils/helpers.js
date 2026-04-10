export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
