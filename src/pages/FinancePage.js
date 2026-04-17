import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import BentoCard from '../components/BentoCard';
import { useFinance } from '../context/FinanceContext';
import { formatRupees } from '../utils/helpers';
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownRight, X, Target, Receipt, Search, Download,
  PiggyBank, RefreshCw, CreditCard, Building2, Pencil,
  Repeat, BarChart3, Zap,
  IndianRupee, Percent, Clock
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'goals', label: 'Goals', icon: PiggyBank },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
];

const ACCOUNT_TYPES = [
  { id: 'wallet', label: 'Wallet', icon: Wallet, color: '#9333ea' },
  { id: 'bank', label: 'Bank', icon: Building2, color: '#3b82f6' },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard, color: '#ef4444' },
  { id: 'savings', label: 'Savings', icon: PiggyBank, color: '#22c55e' },
];

/* ── Chart Tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-glass-border)] shadow-xl">
      <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {formatRupees(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, trend, color, delay = 0, subtitle }) {
  const isPositive = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease }}
      whileHover={{ y: -3, boxShadow: `0 16px 48px rgba(0,0,0,0.2), 0 0 20px ${color}10` }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{typeof value === 'string' ? value : formatRupees(value)}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">{subtitle}</p>}
    </motion.div>
  );
}

/* ── Circular Progress Ring ── */
function ProgressRing({ percentage, size = 56, strokeWidth = 5, color = '#9333ea' }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percentage, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, delay: 0.3, ease }}
      />
    </svg>
  );
}

/* ── Generic Modal Shell ── */
function Modal({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── Add/Edit Transaction Modal ── */
function TransactionModal({ onClose, onSave, editTx, accounts, expenseCategories, incomeCategories }) {
  const [type, setType] = useState(editTx?.type || 'expense');
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '');
  const [description, setDescription] = useState(editTx?.description || '');
  const [category, setCategory] = useState(editTx?.category || 'food');
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(editTx?.account_id || accounts[0]?.id || '');

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'expense' ? 'food' : 'salary');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onSave({
      type, amount: num, description: description.trim() || categories.find(c => c.id === category)?.label || '',
      category, date, account_id: accountId || null,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          {editTx ? 'Edit Transaction' : 'Add Transaction'}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>

      {/* Type Toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-[var(--color-border)] mb-5">
        {[
          { id: 'expense', label: 'Expense', icon: ArrowDownRight, bg: 'bg-red-500/15 border border-red-500/20' },
          { id: 'income', label: 'Income', icon: ArrowUpRight, bg: 'bg-emerald-500/15 border border-emerald-500/20' },
        ].map(opt => (
          <button key={opt.id} onClick={() => handleTypeChange(opt.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              type === opt.id ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {type === opt.id && (
              <motion.div layoutId="txTypeTab" className={`absolute inset-0 rounded-lg ${opt.bg}`}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5"><opt.icon size={14} />{opt.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-lg font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors" />
        </div>

        {/* Account */}
        {accounts.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors">
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2 block">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map(cat => (
              <motion.button key={cat.id} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-all border ${
                  category === cat.id ? 'border-purple-500/30 bg-purple-500/10' : 'border-transparent bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-tight">{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button type="submit" whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(147,51,234,0.2)' }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2">
          {editTx ? 'Save Changes' : (type === 'expense' ? 'Add Expense' : 'Add Income')}
        </motion.button>
      </form>
    </Modal>
  );
}

/* ── Add Savings Goal Modal ── */
function SavingsGoalModal({ onClose, onSave, editGoal }) {
  const [name, setName] = useState(editGoal?.name || '');
  const [target, setTarget] = useState(editGoal ? String(editGoal.target_amount) : '');
  const [current, setCurrent] = useState(editGoal ? String(editGoal.current_amount) : '0');
  const [deadline, setDeadline] = useState(editGoal?.deadline || '');
  const [color, setColor] = useState(editGoal?.color || '#9333ea');

  const colors = ['#9333ea', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !target || parseFloat(target) <= 0) return;
    onSave({ name: name.trim(), target_amount: parseFloat(target), current_amount: parseFloat(current) || 0, deadline: deadline || null, color });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{editGoal ? 'Edit Goal' : 'New Savings Goal'}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Goal Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund, Vacation"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Target Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
              <input type="number" min="0" value={target} onChange={e => setTarget(e.target.value)} placeholder="50,000"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Saved So Far</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
              <input type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Deadline (optional)</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2 block">Color</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-white/30 scale-110' : 'hover:scale-105'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2">
          {editGoal ? 'Save Changes' : 'Create Goal'}
        </motion.button>
      </form>
    </Modal>
  );
}

/* ── Add Recurring Transaction Modal ── */
function RecurringModal({ onClose, onSave, accounts, expenseCategories, incomeCategories }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bills');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDue, setNextDue] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0 || !description.trim()) return;
    onSave({ type, amount: num, description: description.trim(), category, frequency, next_due: nextDue, account_id: accountId || null });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Recurring Transaction</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-[var(--color-border)]">
          {['expense', 'income'].map(t => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'expense' ? 'bills' : 'salary'); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'text-white bg-purple-500/15' : 'text-[var(--color-text-muted)]'}`}>
              {t}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Name</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Netflix, Rent, Salary" autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
              {['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map(f => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Next Due</label>
            <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>
        {accounts.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2">
          Add Recurring
        </motion.button>
      </form>
    </Modal>
  );
}

/* ── Add Account Modal ── */
function AccountModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('0');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const at = ACCOUNT_TYPES.find(a => a.id === type);
    onSave({ name: name.trim(), type, balance: parseFloat(balance) || 0, color: at?.color || '#9333ea', icon: type });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Account</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Account Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDFC Savings, Paytm" autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2 block">Type</label>
          <div className="grid grid-cols-4 gap-2">
            {ACCOUNT_TYPES.map(at => {
              const Icon = at.icon;
              return (
                <button key={at.id} type="button" onClick={() => setType(at.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border ${
                    type === at.id ? 'border-purple-500/30 bg-purple-500/10' : 'border-transparent bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}>
                  <Icon size={18} style={{ color: at.color }} />
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">{at.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Opening Balance</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
          </div>
        </div>
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2">
          Create Account
        </motion.button>
      </form>
    </Modal>
  );
}

/* ── Contribute to Goal Modal ── */
function ContributeModal({ goal, onClose, onContribute }) {
  const [amount, setAmount] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onContribute(goal.id, num);
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add to "{goal.name}"</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>
      <div className="mb-4 text-center">
        <div className="inline-flex items-center justify-center mb-3">
          <ProgressRing percentage={goal.percentage || 0} size={80} strokeWidth={6} color={goal.color} />
          <span className="absolute text-sm font-bold text-[var(--color-text-primary)]">{Math.round(goal.percentage || 0)}%</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{formatRupees(goal.current_amount)} of {formatRupees(goal.target_amount)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
          <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount to add" autoFocus
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-lg font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
        </div>
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20">
          Add Funds
        </motion.button>
      </form>
    </Modal>
  );
}

/* ── Budget Meter (enhanced) ── */
function BudgetMeter({ label, budget, spent, color = '#9333ea' }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget && budget > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">{label}</span>
        <span className={`text-[10px] font-bold ${isOver ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
          {formatRupees(spent)} / {formatRupees(budget)}
        </span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease }}
          className="h-full rounded-full" style={{ background: isOver ? '#ef4444' : color }} />
      </div>
    </div>
  );
}

/* ── Set Budget Modal ── */
function SetBudgetModal({ onClose, onSave, expenseCategories, existingBudgets }) {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (num === undefined || num < 0) return;
    onSave(category || null, num);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Set Budget</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] outline-none focus:border-purple-500/40">
            <option value="">Overall (all categories)</option>
            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Monthly Limit</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-lg font-bold text-[var(--color-text-primary)] outline-none focus:border-purple-500/40 transition-colors" />
          </div>
        </div>
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2">
          Set Budget
        </motion.button>
      </form>
    </Modal>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  OVERVIEW TAB
   ══════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const {
    monthlyIncome, monthlyExpenses, balance, savingsRate, dailyAvg,
    monthlyTrend, expensesByCategory, totalAccountBalance,
    accounts, savingsGoals, recurringTx,
    EXPENSE_CATEGORIES,
  } = useFinance();

  const pieData = expensesByCategory.map(c => ({ name: c.label, value: c.amount, color: c.color }));

  // Trend as area chart data
  const areaData = monthlyTrend.map(m => ({ ...m, net: m.income - m.expenses }));

  // Upcoming recurring
  const upcoming = recurringTx
    .filter(r => r.is_active)
    .sort((a, b) => a.next_due.localeCompare(b.next_due))
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Income" value={monthlyIncome} color="#22c55e" delay={0.05} />
        <StatCard icon={TrendingDown} label="Expenses" value={monthlyExpenses} color="#ef4444" delay={0.1} />
        <StatCard icon={Percent} label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color="#9333ea" delay={0.15}
          subtitle={savingsRate >= 20 ? 'Great job!' : 'Try to save 20%+'} />
        <StatCard icon={Wallet} label="Total Balance" value={totalAccountBalance} color="#3b82f6" delay={0.2} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expense Trend */}
        <BentoCard className="lg:col-span-2" delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Income vs Expenses</h3>
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">6 months</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickFormatter={formatRupees} width={74} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Spending Breakdown */}
        <BentoCard delay={0.3}>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Spending Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {expensesByCategory.slice(0, 5).map(cat => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{cat.label}</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{formatRupees(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-[var(--color-text-muted)]">No expenses yet</p>
            </div>
          )}
        </BentoCard>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Insights */}
        <BentoCard delay={0.35}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Insights</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><IndianRupee size={14} className="text-emerald-400" /></div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">Daily Average</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{formatRupees(dailyAvg)} / day (last 30d)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><BarChart3 size={14} className="text-blue-400" /></div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">Net this month</p>
                <p className={`text-[10px] ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {balance >= 0 ? '+' : ''}{formatRupees(balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Target size={14} className="text-purple-400" /></div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">{savingsGoals.length} Savings Goals</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{savingsGoals.filter(g => g.percentage >= 100).length} completed</p>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Accounts Summary */}
        <BentoCard delay={0.4}>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={14} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Accounts</h3>
          </div>
          {accounts.length > 0 ? (
            <div className="space-y-2.5">
              {accounts.map(acc => {
                const at = ACCOUNT_TYPES.find(a => a.id === acc.type);
                const Icon = at?.icon || Wallet;
                return (
                  <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${acc.color || at?.color || '#9333ea'}15` }}>
                      <Icon size={14} style={{ color: acc.color || at?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{acc.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] capitalize">{acc.type.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${acc.balance >= 0 ? 'text-[var(--color-text-primary)]' : 'text-red-400'}`}>
                      {formatRupees(acc.balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No accounts yet</p>
          )}
        </BentoCard>

        {/* Upcoming Recurring */}
        <BentoCard delay={0.45}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Upcoming</h3>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-2.5">
              {upcoming.map(r => {
                const allCats = [...EXPENSE_CATEGORIES, ...[
                  { id: 'salary', icon: '💰', color: '#22c55e' },
                  { id: 'freelance', icon: '💻', color: '#3b82f6' },
                  { id: 'investment', icon: '📈', color: '#8b5cf6' },
                  { id: 'gift', icon: '🎁', color: '#f59e0b' },
                  { id: 'other', icon: '💵', color: '#6b7280' },
                ]];
                const cat = allCats.find(c => c.id === r.category);
                const daysUntil = Math.ceil((new Date(r.next_due) - new Date()) / 86400000);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                    <span className="text-base">{cat?.icon || '💰'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{r.description}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {daysUntil <= 0 ? 'Due today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                      </p>
                    </div>
                    <span className={`text-xs font-bold ${r.type === 'income' ? 'text-emerald-400' : 'text-[var(--color-text-primary)]'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatRupees(r.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No upcoming bills</p>
          )}
        </BentoCard>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  TRANSACTIONS TAB
   ══════════════════════════════════════════════════════════════ */
function TransactionsTab({ onOpenAdd, onEditTx }) {
  const { transactions, deleteTransaction, exportCSV, EXPENSE_CATEGORIES, INCOME_CATEGORIES } = useFinance();
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('month');

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  const filtered = useMemo(() => {
    let list = [...transactions];

    // Date filter
    const now = new Date();
    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      list = list.filter(t => t.date >= weekAgo);
    } else if (dateRange === 'month') {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      list = list.filter(t => t.date?.startsWith(key));
    } else if (dateRange === 'year') {
      const key = `${now.getFullYear()}`;
      list = list.filter(t => t.date?.startsWith(key));
    }

    // Type filter
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    }

    return list;
  }, [transactions, filterType, searchQuery, dateRange]);

  const monthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-4">
      {/* Search + Filters bar */}
      <BentoCard delay={0.05} className="!p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search transactions..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none focus:border-purple-500/40 transition-colors" />
          </div>

          {/* Date range */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-[var(--color-border)]">
            {[{ id: 'week', label: '7D' }, { id: 'month', label: '1M' }, { id: 'year', label: '1Y' }, { id: 'all', label: 'All' }].map(d => (
              <button key={d.id} onClick={() => setDateRange(d.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${dateRange === d.id ? 'text-white bg-purple-500/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-[var(--color-border)]">
            {['all', 'income', 'expense'].map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all capitalize ${filterType === f ? 'text-white bg-purple-500/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Export */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => exportCSV(monthKey)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-purple-400 hover:bg-purple-500/10 border border-[var(--color-border)] transition-all">
            <Download size={12} /> Export CSV
          </motion.button>
        </div>
      </BentoCard>

      {/* Transaction List */}
      <BentoCard delay={0.1} noPadding>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Transactions</h3>
            <span className="text-[10px] text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded-md">{filtered.length}</span>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {filtered.length > 0 ? (
            <div className="divide-y divide-[var(--color-border)]">
              <AnimatePresence mode="popLayout">
                {filtered.map((tx, i) => {
                  const cat = allCategories.find(c => c.id === tx.category);
                  const isIncome = tx.type === 'income';
                  return (
                    <motion.div key={tx.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="flex items-center gap-3 px-5 py-3 group hover:bg-[var(--color-surface-hover)] transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: `${cat?.color || '#6b7280'}15` }}>
                        {cat?.icon || '💰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-primary)] truncate font-medium">{tx.description}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {cat?.label || tx.category} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-[var(--color-text-primary)]'}`}>
                        {isIncome ? '+' : '-'}{formatRupees(tx.amount)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => onEditTx(tx)} className="p-1 rounded-lg hover:bg-purple-500/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-all">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteTransaction(tx.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
                <Receipt size={22} className="text-purple-400" />
              </motion.div>
              <p className="text-xs text-[var(--color-text-muted)]">No transactions found</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  BUDGETS TAB
   ══════════════════════════════════════════════════════════════ */
function BudgetsTab({ onOpenSetBudget }) {
  const { budgets, monthlyExpenses, deleteBudget, EXPENSE_CATEGORIES } = useFinance();

  const overallBudget = budgets.find(b => !b.category);
  const categoryBudgets = budgets.filter(b => b.category);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Monthly Budgets</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Track spending against limits</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenSetBudget}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-400 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
          <Plus size={14} /> Set Budget
        </motion.button>
      </div>

      {/* Overall budget */}
      {overallBudget && (
        <BentoCard delay={0.05}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Overall Budget</h3>
            </div>
            <button onClick={() => deleteBudget(overallBudget.id)} className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
          <BudgetMeter label="Total Spending" budget={overallBudget.amount} spent={overallBudget.spent || monthlyExpenses} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)]">{formatRupees(overallBudget.remaining || Math.max(overallBudget.amount - monthlyExpenses, 0))} remaining</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">{((overallBudget.spent || monthlyExpenses) / overallBudget.amount * 100).toFixed(0)}% used</span>
          </div>
        </BentoCard>
      )}

      {/* Category budgets */}
      {categoryBudgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryBudgets.map((b, i) => {
            const cat = EXPENSE_CATEGORIES.find(c => c.id === b.category);
            return (
              <BentoCard key={b.id} delay={0.1 + i * 0.05}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat?.icon || '📦'}</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{cat?.label || b.category}</span>
                  </div>
                  <button onClick={() => deleteBudget(b.id)} className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <BudgetMeter label="" budget={b.amount} spent={b.spent || 0} color={cat?.color || '#9333ea'} />
              </BentoCard>
            );
          })}
        </div>
      ) : !overallBudget && (
        <BentoCard delay={0.1}>
          <div className="flex flex-col items-center py-12">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Target size={22} className="text-purple-400" />
            </motion.div>
            <p className="text-xs text-[var(--color-text-muted)]">No budgets set</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">Set a monthly budget to track your spending</p>
          </div>
        </BentoCard>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  SAVINGS GOALS TAB
   ══════════════════════════════════════════════════════════════ */
function GoalsTab({ onOpenAdd, onOpenContribute }) {
  const { savingsGoals, deleteSavingsGoal } = useFinance();

  const totalSaved = savingsGoals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + (g.target_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Savings Goals</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {totalTarget > 0 ? `${formatRupees(totalSaved)} saved of ${formatRupees(totalTarget)}` : 'Create goals to start saving'}
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-400 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
          <Plus size={14} /> New Goal
        </motion.button>
      </div>

      {savingsGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsGoals.map((goal, i) => {
            const pct = goal.percentage || 0;
            const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;
            return (
              <BentoCard key={goal.id} delay={0.05 + i * 0.05}>
                <div className="flex items-start gap-4">
                  <div className="relative flex items-center justify-center">
                    <ProgressRing percentage={pct} size={64} strokeWidth={5} color={goal.color} />
                    <span className="absolute text-xs font-bold text-[var(--color-text-primary)]">{Math.round(pct)}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{goal.name}</h4>
                      <button onClick={() => deleteSavingsGoal(goal.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {formatRupees(goal.current_amount)} of {formatRupees(goal.target_amount)}
                    </p>
                    {daysLeft !== null && (
                      <p className={`text-[10px] mt-1 ${daysLeft <= 7 ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                        {daysLeft <= 0 ? 'Deadline passed' : `${daysLeft} days left`}
                      </p>
                    )}
                    {pct < 100 && (
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => onOpenContribute(goal)}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all"
                        style={{ background: goal.color }}>
                        <Plus size={10} /> Add Funds
                      </motion.button>
                    )}
                    {pct >= 100 && (
                      <span className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-emerald-400 bg-emerald-500/10">
                        Goal reached!
                      </span>
                    )}
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      ) : (
        <BentoCard delay={0.1}>
          <div className="flex flex-col items-center py-12">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <PiggyBank size={22} className="text-purple-400" />
            </motion.div>
            <p className="text-xs text-[var(--color-text-muted)]">No savings goals yet</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">Create one to start tracking your progress</p>
          </div>
        </BentoCard>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  RECURRING TAB
   ══════════════════════════════════════════════════════════════ */
function RecurringTab({ onOpenAdd }) {
  const { recurringTx, processRecurring, deleteRecurring, EXPENSE_CATEGORIES, INCOME_CATEGORIES } = useFinance();
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  const totalMonthly = recurringTx.filter(r => r.is_active).reduce((sum, r) => {
    const mult = r.frequency === 'daily' ? 30 : r.frequency === 'weekly' ? 4.33 : r.frequency === 'biweekly' ? 2.17 : r.frequency === 'yearly' ? 1/12 : 1;
    return sum + (r.type === 'expense' ? r.amount * mult : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recurring Transactions</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            ~{formatRupees(totalMonthly)}/month in recurring expenses
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-400 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
          <Plus size={14} /> Add Recurring
        </motion.button>
      </div>

      {recurringTx.length > 0 ? (
        <div className="space-y-3">
          {recurringTx.map((r, i) => {
            const cat = allCategories.find(c => c.id === r.category);
            const daysUntil = Math.ceil((new Date(r.next_due) - new Date()) / 86400000);
            const isDue = daysUntil <= 0;
            return (
              <BentoCard key={r.id} delay={0.05 + i * 0.03}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${cat?.color || '#6b7280'}15` }}>
                    {cat?.icon || '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{r.description}</p>
                      <span className="text-[10px] text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded-md capitalize">{r.frequency}</span>
                      {!r.is_active && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md">Paused</span>}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Next: {new Date(r.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {isDue && <span className="text-amber-400 ml-1">(Due!)</span>}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${r.type === 'income' ? 'text-emerald-400' : 'text-[var(--color-text-primary)]'}`}>
                    {r.type === 'income' ? '+' : '-'}{formatRupees(r.amount)}
                  </span>
                  <div className="flex gap-1">
                    {isDue && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => processRecurring(r.id)}
                        className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all"
                        title="Process now">
                        <RefreshCw size={12} />
                      </motion.button>
                    )}
                    <button onClick={() => deleteRecurring(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      ) : (
        <BentoCard delay={0.1}>
          <div className="flex flex-col items-center py-12">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Repeat size={22} className="text-purple-400" />
            </motion.div>
            <p className="text-xs text-[var(--color-text-muted)]">No recurring transactions</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">Add subscriptions, rent, salary, etc.</p>
          </div>
        </BentoCard>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  ACCOUNTS TAB
   ══════════════════════════════════════════════════════════════ */
function AccountsTab({ onOpenAdd }) {
  const { accounts, deleteAccount, totalAccountBalance } = useFinance();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Accounts</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Total: {formatRupees(totalAccountBalance)}</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-400 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
          <Plus size={14} /> Add Account
        </motion.button>
      </div>

      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc, i) => {
            const at = ACCOUNT_TYPES.find(a => a.id === acc.type);
            const Icon = at?.icon || Wallet;
            return (
              <BentoCard key={acc.id} delay={0.05 + i * 0.05}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${acc.color || at?.color || '#9333ea'}15` }}>
                    <Icon size={20} style={{ color: acc.color || at?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{acc.name}</h4>
                      {!acc.is_default && (
                        <button onClick={() => deleteAccount(acc.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] capitalize">{acc.type.replace('_', ' ')}</p>
                    <p className={`text-lg font-bold mt-1 ${acc.balance >= 0 ? 'text-[var(--color-text-primary)]' : 'text-red-400'}`}>
                      {formatRupees(acc.balance)}
                    </p>
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      ) : (
        <BentoCard delay={0.1}>
          <div className="flex flex-col items-center py-12">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Wallet size={22} className="text-purple-400" />
            </motion.div>
            <p className="text-xs text-[var(--color-text-muted)]">No accounts yet</p>
          </div>
        </BentoCard>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ██  MAIN FINANCE PAGE
   ══════════════════════════════════════════════════════════════ */
export default function FinancePage() {
  const { accounts, EXPENSE_CATEGORIES, INCOME_CATEGORIES, loading } = useFinance();
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [contributeGoal, setContributeGoal] = useState(null);

  const { addTransaction, updateTransaction, addSavingsGoal, addRecurring, addAccount, setBudget, budgets, contributeSavings } = useFinance();

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleSaveTx = async (data) => {
    if (editingTx) {
      await updateTransaction(editingTx.id, data);
    } else {
      await addTransaction(data);
    }
    setEditingTx(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Finance</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{currentMonth}</p>
        </div>
        <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.3)' }} whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingTx(null); setShowTxModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
          style={{ background: 'var(--accent-color)' }}>
          <Plus size={16} /> Add Transaction
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
                isActive ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}>
              {isActive && (
                <motion.div layoutId="financeTab" className="absolute inset-0 rounded-lg bg-purple-500/15 border border-purple-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><Icon size={13} />{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease }}>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'transactions' && (
              <TransactionsTab
                onOpenAdd={() => { setEditingTx(null); setShowTxModal(true); }}
                onEditTx={(tx) => { setEditingTx(tx); setShowTxModal(true); }}
              />
            )}
            {activeTab === 'budgets' && <BudgetsTab onOpenSetBudget={() => setShowBudgetModal(true)} />}
            {activeTab === 'goals' && (
              <GoalsTab
                onOpenAdd={() => setShowGoalModal(true)}
                onOpenContribute={(goal) => setContributeGoal(goal)}
              />
            )}
            {activeTab === 'recurring' && <RecurringTab onOpenAdd={() => setShowRecurringModal(true)} />}
            {activeTab === 'accounts' && <AccountsTab onOpenAdd={() => setShowAccountModal(true)} />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showTxModal && (
          <TransactionModal
            onClose={() => { setShowTxModal(false); setEditingTx(null); }}
            onSave={handleSaveTx}
            editTx={editingTx}
            accounts={accounts}
            expenseCategories={EXPENSE_CATEGORIES}
            incomeCategories={INCOME_CATEGORIES}
          />
        )}
        {showGoalModal && (
          <SavingsGoalModal
            onClose={() => setShowGoalModal(false)}
            onSave={(data) => addSavingsGoal(data)}
          />
        )}
        {showRecurringModal && (
          <RecurringModal
            onClose={() => setShowRecurringModal(false)}
            onSave={(data) => addRecurring(data)}
            accounts={accounts}
            expenseCategories={EXPENSE_CATEGORIES}
            incomeCategories={INCOME_CATEGORIES}
          />
        )}
        {showAccountModal && (
          <AccountModal
            onClose={() => setShowAccountModal(false)}
            onSave={(data) => addAccount(data)}
          />
        )}
        {showBudgetModal && (
          <SetBudgetModal
            onClose={() => setShowBudgetModal(false)}
            onSave={(category, amount) => setBudget(category, amount)}
            expenseCategories={EXPENSE_CATEGORIES}
            existingBudgets={budgets}
          />
        )}
        {contributeGoal && (
          <ContributeModal
            goal={contributeGoal}
            onClose={() => setContributeGoal(null)}
            onContribute={contributeSavings}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
