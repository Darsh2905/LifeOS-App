import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NotesContext';
import { ACCENT_COLORS } from '../utils/constants';
import { Sun, Moon, Palette, Check, RotateCcw, AlertTriangle, X, LogOut, User, Mail, Shield, ImageIcon, Cloud, Brain, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

const IMAGE_THEMES = [
  { id: 'neon', label: '🌆 Neon', preview: '/images/hero-banner.png' },
  { id: 'zen', label: '🏯 Zen', preview: '/images/themes/zen/hero-banner.png' },
  { id: 'ocean', label: '🌊 Ocean', preview: '/images/themes/ocean/hero-banner.png' },
  { id: 'aurora', label: '🌌 Aurora', preview: '/images/themes/aurora/hero-banner.svg' },
  { id: 'sakura', label: '🌸 Sakura', preview: '/images/themes/sakura/hero-banner.svg' },
];

export default function SettingsPage() {
  const { isDark, toggleTheme, accentColor, setAccentColor } = useTheme();
  const { user, logout } = useAuth();
  const { clearAllTasks } = useTasks();
  const { clearAllNotes } = useNotes();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [imageTheme, setImageTheme] = useState(() => storage.get('lifeos-image-theme', 'neon'));
  const [weatherCity, setWeatherCity] = useState('');
  const [citySaving, setCitySaving] = useState(false);
  const [citySaved, setCitySaved] = useState(false);
  const [services, setServices] = useState({ ai: false, weather: false });

  // Load settings and health status
  useEffect(() => {
    (async () => {
      try {
        const [settings, health] = await Promise.all([
          api.get('/settings'),
          fetch('/api/health').then(r => r.json()).catch(() => ({})),
        ]);
        if (settings.weather_city) setWeatherCity(settings.weather_city);
        if (health.services) setServices(health.services);
      } catch { /* silent */ }
    })();
  }, []);

  const saveWeatherCity = async () => {
    if (!weatherCity.trim()) return;
    setCitySaving(true);
    try {
      await api.put('/settings', { key: 'weather_city', value: weatherCity.trim() });
      setCitySaved(true);
      setTimeout(() => setCitySaved(false), 2000);
    } catch { /* silent */ }
    finally { setCitySaving(false); }
  };

  const switchImageTheme = (id) => {
    setImageTheme(id);
    storage.set('lifeos-image-theme', id);
  };

  const clearData = () => {
    setIsResetting(true);
    clearAllTasks();
    clearAllNotes();
    // Clear data but preserve user accounts and session
    const session = localStorage.getItem('lifeos-session');
    const users = localStorage.getItem('lifeos-users');
    localStorage.clear();
    if (session) localStorage.setItem('lifeos-session', session);
    if (users) localStorage.setItem('lifeos-users', users);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 max-w-2xl"
    >
      <motion.h1
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold text-[var(--color-text-primary)]"
      >
        Settings
      </motion.h1>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/20"
          >
            {user?.avatar || 'U'}
          </motion.div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{user?.name || 'User'}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail size={12} className="text-[var(--color-text-muted)]" />
              <p className="text-xs text-[var(--color-text-muted)]">{user?.email || ''}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield size={12} className="text-[var(--color-text-muted)]" />
              <p className="text-xs text-[var(--color-text-muted)]">Member since {memberSince}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </motion.button>
        </div>
      </motion.div>

      {/* Theme Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isDark ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {isDark ? <Moon size={20} className="text-[var(--color-text-secondary)]" /> : <Sun size={20} className="text-amber-400" />}
            </motion.div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Theme</p>
              <p className="text-xs text-[var(--color-text-muted)]">{isDark ? 'Dark' : 'Light'} mode</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`w-12 h-7 rounded-full relative transition-colors ${isDark ? 'bg-purple-500' : 'bg-gray-300'}`}
          >
            <motion.div
              animate={{ x: isDark ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white absolute top-1 shadow"
            />
          </motion.button>
        </div>
      </motion.div>

      {/* Accent Color */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <Palette size={20} className="text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Accent Color</p>
            <p className="text-xs text-[var(--color-text-muted)]">Choose your preferred accent</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map((color, i) => (
            <motion.button
              key={color}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 300 }}
              whileHover={{ scale: 1.2, rotate: 10 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => setAccentColor(color)}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-shadow hover:shadow-xl"
              style={{ background: color }}
            >
              <AnimatePresence>
                {accentColor === color && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Check size={18} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Image Theme */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon size={20} className="text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Image Theme</p>
            <p className="text-xs text-[var(--color-text-muted)]">Change the dashboard picture set</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2.5">
          {IMAGE_THEMES.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.22 + i * 0.04, type: 'spring', stiffness: 300 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => switchImageTheme(t.id)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                imageTheme === t.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-transparent hover:border-[var(--color-border-hover)]'
              }`}
            >
              <div className="aspect-[16/10] bg-[var(--color-surface-dark)]">
                <img src={t.preview} alt={t.label} className="w-full h-full object-cover" />
              </div>
              <div className="px-2 py-1.5 bg-[var(--color-surface-elevated)]">
                <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">{t.label}</span>
              </div>
              <AnimatePresence>
                {imageTheme === t.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-md"
                  >
                    <Check size={11} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Weather & Location */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <Cloud size={20} className="text-sky-400" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Weather & Location</p>
            <p className="text-xs text-[var(--color-text-muted)]">Set your city for the weather widget</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={weatherCity}
              onChange={e => setWeatherCity(e.target.value)}
              placeholder="e.g. Mumbai, London, New York"
              onKeyDown={e => e.key === 'Enter' && saveWeatherCity()}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.02] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveWeatherCity}
            disabled={citySaving || !weatherCity.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/20 disabled:opacity-40 transition-all flex items-center gap-2"
          >
            {citySaved ? <><Check size={14} /> Saved</> : citySaving ? 'Saving...' : 'Save'}
          </motion.button>
        </div>
      </motion.div>

      {/* AI & Services Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <Brain size={20} className="text-purple-400" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">AI & Services</p>
            <p className="text-xs text-[var(--color-text-muted)]">Status of backend API integrations</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${services.ai ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${services.ai ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
              {services.ai ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-primary)]">Local AI Engine</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{services.ai ? 'Available' : 'Unavailable'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${services.weather ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${services.weather ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
              {services.weather ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-primary)]">Weather</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{services.weather ? 'Connected' : 'API key missing'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data & Storage Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <User size={20} className="text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Data & Storage</p>
            <p className="text-xs text-[var(--color-text-muted)]">Your data is stored locally in this browser</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { label: 'Tasks', key: 'lifeos-tasks' },
            { label: 'Notes', key: 'lifeos-notes' },
            { label: 'Journal', key: 'lifeos-journal' },
            { label: 'Habits', key: 'lifeos-habits' },
          ].map(item => {
            let count = 0;
            try { count = JSON.parse(localStorage.getItem(item.key) || '[]').length; } catch {}
            return (
              <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Reset Data */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -1, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw size={20} className="text-red-400" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Reset Data</p>
              <p className="text-xs text-[var(--color-text-muted)]">Clear all tasks, notes, and settings</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Reset All
          </motion.button>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 shadow-2xl"
            >
              {isResetting ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 rounded-full border-3 border-red-400/30 border-t-red-400 mb-4"
                    style={{ borderWidth: 3 }}
                  />
                  <p className="text-sm text-[var(--color-text-secondary)]">Resetting all data...</p>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Reset All Data?</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">This cannot be undone</p>
                    </div>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                    All your tasks, notes, journal entries, habits, workouts, meals, and timer sessions will be permanently deleted. Your account will remain.
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearData}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      Reset Everything
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
