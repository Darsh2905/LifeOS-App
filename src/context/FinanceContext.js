import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();

const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { id: 'bills', label: 'Bills & Utilities', icon: '💡', color: '#ef4444' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { id: 'health', label: 'Health', icon: '💊', color: '#10b981' },
  { id: 'education', label: 'Education', icon: '📚', color: '#06b6d4' },
  { id: 'other', label: 'Other', icon: '📦', color: '#6b7280' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: '💰', color: '#22c55e' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#3b82f6' },
  { id: 'investment', label: 'Investment', icon: '📈', color: '#8b5cf6' },
  { id: 'gift', label: 'Gift', icon: '🎁', color: '#f59e0b' },
  { id: 'other', label: 'Other', icon: '💵', color: '#6b7280' },
];

export function FinanceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [recurringTx, setRecurringTx] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch all data on auth ──
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [txs, sum, accs, buds, goals, recs] = await Promise.all([
        api.get('/transactions?limit=200'),
        api.get('/transactions/summary?months=6'),
        api.get('/accounts'),
        api.get('/budgets'),
        api.get('/savings'),
        api.get('/recurring'),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setAccounts(accs);
      setBudgets(buds);
      setSavingsGoals(goals);
      setRecurringTx(recs);
    } catch (err) {
      console.error('Finance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Transactions ──
  const addTransaction = useCallback(async (tx) => {
    const created = await api.post('/transactions', tx);
    setTransactions(prev => [created, ...prev]);
    // Refresh summary and accounts in background
    Promise.all([
      api.get('/transactions/summary?months=6').then(setSummary),
      api.get('/accounts').then(setAccounts),
      api.get('/budgets').then(setBudgets),
    ]).catch(() => {});
    return created;
  }, []);

  const updateTransaction = useCallback(async (id, updates) => {
    const updated = await api.put(`/transactions/${id}`, updates);
    setTransactions(prev => prev.map(t => t.id === id ? updated : t));
    Promise.all([
      api.get('/transactions/summary?months=6').then(setSummary),
      api.get('/accounts').then(setAccounts),
      api.get('/budgets').then(setBudgets),
    ]).catch(() => {});
    return updated;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await api.delete(`/transactions/${id}`);
    setTransactions(prev => prev.filter(t => t.id !== id));
    Promise.all([
      api.get('/transactions/summary?months=6').then(setSummary),
      api.get('/accounts').then(setAccounts),
      api.get('/budgets').then(setBudgets),
    ]).catch(() => {});
  }, []);

  const exportCSV = useCallback(async (month) => {
    const csv = await api.get(`/transactions/export${month ? `?month=${month}` : ''}`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-transactions-${month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Accounts ──
  const addAccount = useCallback(async (acc) => {
    const created = await api.post('/accounts', acc);
    setAccounts(prev => [...prev, created]);
    return created;
  }, []);

  const updateAccount = useCallback(async (id, updates) => {
    const updated = await api.put(`/accounts/${id}`, updates);
    setAccounts(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteAccount = useCallback(async (id) => {
    await api.delete(`/accounts/${id}`);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Budgets ──
  const setBudget = useCallback(async (category, amount, month) => {
    const result = await api.post('/budgets', { category, amount, month });
    setBudgets(result);
    return result;
  }, []);

  const deleteBudget = useCallback(async (id) => {
    await api.delete(`/budgets/${id}`);
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── Savings Goals ──
  const addSavingsGoal = useCallback(async (goal) => {
    const created = await api.post('/savings', goal);
    setSavingsGoals(prev => [created, ...prev]);
    return created;
  }, []);

  const updateSavingsGoal = useCallback(async (id, updates) => {
    const updated = await api.put(`/savings/${id}`, updates);
    setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
    return updated;
  }, []);

  const contributeSavings = useCallback(async (id, amount) => {
    const updated = await api.put(`/savings/${id}/contribute`, { amount });
    setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
    return updated;
  }, []);

  const deleteSavingsGoal = useCallback(async (id) => {
    await api.delete(`/savings/${id}`);
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // ── Recurring Transactions ──
  const addRecurring = useCallback(async (rec) => {
    const created = await api.post('/recurring', rec);
    setRecurringTx(prev => [created, ...prev]);
    return created;
  }, []);

  const updateRecurring = useCallback(async (id, updates) => {
    const updated = await api.put(`/recurring/${id}`, updates);
    setRecurringTx(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const processRecurring = useCallback(async (id) => {
    const result = await api.post(`/recurring/${id}/process`);
    setTransactions(prev => [result.transaction, ...prev]);
    setRecurringTx(prev => prev.map(r => r.id === id ? result.recurring : r));
    Promise.all([
      api.get('/transactions/summary?months=6').then(setSummary),
      api.get('/accounts').then(setAccounts),
    ]).catch(() => {});
    return result;
  }, []);

  const deleteRecurring = useCallback(async (id) => {
    await api.delete(`/recurring/${id}`);
    setRecurringTx(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── Derived data from summary ──
  const monthlyIncome = summary?.monthlyIncome || 0;
  const monthlyExpenses = summary?.monthlyExpenses || 0;
  const balance = summary?.balance || 0;
  const netWorth = summary?.netWorth || 0;
  const savingsRate = summary?.savingsRate || 0;
  const dailyAvg = summary?.dailyAvg || 0;
  const monthlyTrend = summary?.monthlyTrend || [];
  const topSpendingDay = summary?.topSpendingDay || null;

  const expensesByCategory = useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return summary.categoryBreakdown.map(cb => {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === cb.category) || { label: cb.category, color: '#6b7280', icon: '📦' };
      return { ...cat, amount: cb.total };
    });
  }, [summary]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(t => t.date?.startsWith(key));
  }, [transactions]);

  const totalAccountBalance = useMemo(() =>
    accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    [accounts]
  );

  return (
    <FinanceContext.Provider value={{
      // State
      transactions, monthlyTransactions, accounts, budgets, savingsGoals, recurringTx, loading,
      // Summary
      monthlyIncome, monthlyExpenses, balance, netWorth, savingsRate, dailyAvg, monthlyTrend,
      expensesByCategory, topSpendingDay, totalAccountBalance,
      // Transaction actions
      addTransaction, updateTransaction, deleteTransaction, exportCSV,
      // Account actions
      addAccount, updateAccount, deleteAccount,
      // Budget actions
      setBudget, deleteBudget,
      // Savings goal actions
      addSavingsGoal, updateSavingsGoal, contributeSavings, deleteSavingsGoal,
      // Recurring actions
      addRecurring, updateRecurring, processRecurring, deleteRecurring,
      // Refresh
      refresh,
      // Constants
      EXPENSE_CATEGORIES, INCOME_CATEGORIES,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
