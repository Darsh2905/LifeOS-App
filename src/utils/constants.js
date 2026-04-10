export const PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const TASK_STATES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const PRIORITY_COLORS = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400', label: 'High' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Med' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Low' },
};

export const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'Does not repeat' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export const ACCENT_COLORS = [
  '#9333ea', '#7c3aed', '#6366f1', '#ec4899',
  '#f43f5e', '#f59e0b', '#22c55e', '#06b6d4',
];

export const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Small daily improvements lead to staggering long-term results.", author: "Robin Sharma" },
  { text: "Your future is created by what you do today.", author: "Robert Kiyosaki" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
];

export const POMODORO_DURATION = 60 * 60;
export const SHORT_BREAK = 5 * 60;
export const LONG_BREAK = 15 * 60;

export const CATEGORIES = [
  {
    id: 'daily',
    title: 'Daily',
    gradient: 'from-purple-900/80 via-purple-800/60 to-indigo-900/80',
    items: [
      { icon: '📋', label: 'Planner' },
      { icon: '🔄', label: 'Habits' },
      { icon: '✏️', label: 'Journal' },
    ],
  },
  {
    id: 'planners',
    title: 'Planners',
    gradient: 'from-violet-900/80 via-fuchsia-900/60 to-purple-900/80',
    items: [
      { icon: '🍽️', label: 'Meal Planner' },
      { icon: '📍', label: 'Travel Planner' },
      { icon: '💪', label: 'Workout Planner' },
    ],
  },
  {
    id: 'personal',
    title: 'Personal',
    gradient: 'from-indigo-900/80 via-blue-900/60 to-violet-900/80',
    items: [
      { icon: '📚', label: 'Bookshelf' },
      { icon: '🎬', label: 'Movies & Series' },
      { icon: '💰', label: 'Finance' },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    gradient: 'from-fuchsia-900/80 via-pink-900/60 to-purple-900/80',
    items: [
      { icon: '🎯', label: 'Goals' },
      { icon: '✨', label: 'Vision' },
      { icon: '❤️', label: 'Health' },
    ],
  },
];

export const OVERVIEW_TABS = [
  { id: 'todo', icon: '☑️', label: 'Todo' },
  { id: 'journal', icon: '✏️', label: 'Journal' },
  { id: 'habits', icon: '🔄', label: 'Habits' },
  { id: 'workout', icon: '💪', label: 'Workout' },
  { id: 'meal', icon: '🍽️', label: 'Meal' },
];
