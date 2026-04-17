import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { NotesProvider } from './context/NotesContext';
import { TimerProvider } from './context/TimerContext';
import { FocusProvider } from './context/FocusContext';
import { FinanceProvider } from './context/FinanceContext';
import { HabitsProvider } from './context/HabitsContext';
import { JournalProvider } from './context/JournalContext';
import { WorkoutProvider } from './context/WorkoutContext';
import { MealProvider } from './context/MealContext';
import { SleepProvider } from './context/SleepContext';
import { PlannerProvider } from './context/PlannerContext';
import { WaterProvider } from './context/WaterContext';
import { BooksProvider } from './context/BooksContext';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import AuroraBackground from './components/AuroraBackground';
import CursorSpotlight from './components/CursorSpotlight';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import TimerPage from './pages/TimerPage';
import NotesPage from './pages/NotesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import FinancePage from './pages/FinancePage';
import FocusMode from './pages/FocusMode';
import DailyPlanner from './pages/DailyPlanner';
import WellnessPage from './pages/WellnessPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';

const pages = {
  dashboard: Dashboard,
  tasks: TasksPage,
  timer: TimerPage,
  notes: NotesPage,
  finance: FinancePage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
  planner: DailyPlanner,
  wellness: WellnessPage,
  admin: AdminPage,
};

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [pageAction, setPageAction] = useState(null);
  const Page = pages[activePage] || Dashboard;

  const handleNavigate = (page, action = null) => {
    setPageAction(action ? { page, action, id: Date.now() } : null);
    setActivePage(page);
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-surface-dark)] transition-colors duration-300 noise-overlay">
      <AuroraBackground />
      <CursorSpotlight />
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <CommandPalette activePage={activePage} onNavigate={handleNavigate} />
      <main className="pl-[92px]">
        <div className="p-6 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page
                onNavigate={handleNavigate}
                pageAction={pageAction}
                onPageActionHandled={() => setPageAction(null)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <FocusMode />
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500"
          />
          <p className="text-sm text-[#555]">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isAuthenticated ? (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TaskProvider>
            <NotesProvider>
              <TimerProvider>
                <FocusProvider>
                  <FinanceProvider>
                    <HabitsProvider>
                      <JournalProvider>
                        <WorkoutProvider>
                          <MealProvider>
                            <SleepProvider>
                              <PlannerProvider>
                                <WaterProvider>
                                  <BooksProvider>
                                    <AppContent />
                                  </BooksProvider>
                                </WaterProvider>
                              </PlannerProvider>
                            </SleepProvider>
                          </MealProvider>
                        </WorkoutProvider>
                      </JournalProvider>
                    </HabitsProvider>
                  </FinanceProvider>
                </FocusProvider>
              </TimerProvider>
            </NotesProvider>
          </TaskProvider>
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AuthPage />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
