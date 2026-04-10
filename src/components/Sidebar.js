import { motion } from 'framer-motion';
import {
  LayoutDashboard, ListTodo, Clock, StickyNote, BarChart3,
  Settings, Crosshair, Sun, Moon, LogOut, Sparkles, Wallet
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useFocus } from '../context/FocusContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'finance', icon: Wallet, label: 'Finance' },
  { id: 'tasks', icon: ListTodo, label: 'Tasks' },
  { id: 'timer', icon: Clock, label: 'Timer' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { isDark, toggleTheme } = useTheme();
  const { enterFocus } = useFocus();
  const { logout } = useAuth();

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 bottom-0 w-[84px] flex flex-col items-center py-5 z-40
        bg-[var(--color-surface-darker)]/80 backdrop-blur-xl border-r border-[var(--color-border)]"
    >
      {/* Brand */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => onNavigate('dashboard')}
        title="LifeOS"
        className="group flex flex-col items-center gap-2 mb-7 cursor-pointer"
      >
        <span className="relative w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20 overflow-hidden">
          <span className="absolute inset-x-2 top-1 h-px bg-white/35" />
          <Sparkles size={19} className="text-white" />
        </span>
        <span className="text-[12px] font-extrabold tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-violet-500">
          LifeOS
        </span>
        <span className="w-6 h-px rounded-full bg-gradient-to-r from-transparent via-[var(--accent-color)] to-transparent opacity-70 group-hover:w-8 transition-all" />
      </motion.button>

      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map(({ id, icon: Icon, label }, idx) => {
          const isActive = activePage === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => onNavigate(id)}
              title={label}
              className={`
                relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                ${isActive
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute -left-[13px] w-1 h-5 rounded-r-full bg-purple-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            </motion.button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1.5">
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => enterFocus()}
          title="Focus Mode"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-400 hover:bg-purple-500/10 transition-all"
        >
          <Crosshair size={19} strokeWidth={1.8} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          onClick={toggleTheme}
          title="Toggle theme"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5 transition-all"
        >
          <motion.div
            animate={{ rotate: isDark ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {isDark ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </motion.div>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          onClick={logout}
          title="Sign out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={19} strokeWidth={1.8} />
        </motion.button>
      </div>
    </motion.aside>
  );
}
