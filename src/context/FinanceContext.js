import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';
import { generateId } from '../utils/helpers';

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
  const [transactions, setTransactions] = useState(() => storage.get('lifeos-finance', []));
  const [budget, setBudget] = useState(() => storage.get('lifeos-budget', 0));

  useEffect(() => {
    storage.set('lifeos-finance', transactions);
  }, [transactions]);

  useEffect(() => {
    storage.set('lifeos-budget', budget);
  }, [budget]);

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [{
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...tx,
    }, ...prev]);
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setTransactions([]);
  }, []);

  const updateBudget = useCallback((amount) => {
    setBudget(amount);
  }, []);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthlyTransactions = useMemo(() =>
    transactions.filter(t => t.createdAt.startsWith(currentMonthKey)),
    [transactions, currentMonthKey]
  );

  const monthlyIncome = useMemo(() =>
    monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions]
  );

  const monthlyExpenses = useMemo(() =>
    monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions]
  );

  const balance = monthlyIncome - monthlyExpenses;

  // Spending by category (this month)
  const expensesByCategory = useMemo(() => {
    const map = {};
    monthlyTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return EXPENSE_CATEGORIES
      .map(cat => ({ ...cat, amount: map[cat.id] || 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions]);

  // Last 6 months trend
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxs = transactions.filter(t => t.createdAt.startsWith(key));
      const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        income: inc,
        expenses: exp,
      };
    });
  }, [transactions]);

  return (
    <FinanceContext.Provider value={{
      transactions, monthlyTransactions, addTransaction, deleteTransaction, clearAll,
      monthlyIncome, monthlyExpenses, balance,
      expensesByCategory, monthlyTrend,
      budget, updateBudget,
      EXPENSE_CATEGORIES, INCOME_CATEGORIES,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
