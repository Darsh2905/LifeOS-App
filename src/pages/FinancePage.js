import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import BentoCard from '../components/BentoCard';
import { useFinance } from '../context/FinanceContext';
import { formatRupees } from '../utils/helpers';
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownRight, X, Target, Receipt
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

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
function StatCard({ icon: Icon, label, value, trend, color, delay = 0 }) {
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
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{formatRupees(value)}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </motion.div>
  );
}

/* ── Add Transaction Modal ── */
function AddTransactionModal({ onClose, onAdd, expenseCategories, incomeCategories }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  // Reset category when type changes
  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'expense' ? 'food' : 'salary');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onAdd({
      type,
      amount: num,
      description: description.trim() || categories.find(c => c.id === category)?.label || '',
      category,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Transaction</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-[var(--color-border)] mb-5">
          {[
            { id: 'expense', label: 'Expense', icon: ArrowDownRight, color: 'text-red-400' },
            { id: 'income', label: 'Income', icon: ArrowUpRight, color: 'text-emerald-400' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => handleTypeChange(opt.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                type === opt.id ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {type === opt.id && (
                <motion.div
                  layoutId="txTypeTab"
                  className={`absolute inset-0 rounded-lg ${opt.id === 'expense' ? 'bg-red-500/15 border border-red-500/20' : 'bg-emerald-500/15 border border-emerald-500/20'}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <opt.icon size={14} />
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-lg font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1.5 block">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/30 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <motion.button
                  key={cat.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-all border ${
                    category === cat.id
                      ? 'border-purple-500/30 bg-purple-500/10'
                      : 'border-transparent bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-tight">{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(147,51,234,0.2)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 mt-2"
          >
            {type === 'expense' ? 'Add Expense' : 'Add Income'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Budget Meter ── */
function BudgetMeter({ budget, spent, onEditBudget }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budget));
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget && budget > 0;

  const handleSave = () => {
    const num = parseFloat(value);
    if (num >= 0) onEditBudget(num);
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-purple-400" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">Monthly Budget</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">₹</span>
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onBlur={handleSave}
              autoFocus
              type="number"
              min="0"
              className="w-20 bg-transparent text-xs font-bold text-[var(--color-text-primary)] outline-none border-b border-purple-500/40 text-right"
            />
          </div>
        ) : (
          <button
            onClick={() => { setValue(String(budget)); setEditing(true); }}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            {budget > 0 ? formatRupees(budget) : 'Set budget'}
          </button>
        )}
      </div>
      {budget > 0 && (
        <>
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, delay: 0.3, ease }}
              className={`h-full rounded-full ${isOver ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'}`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className={`font-semibold ${isOver ? 'text-red-400' : 'text-[var(--color-text-secondary)]'}`}>
              {formatRupees(spent)} spent
            </span>
            <span className="text-[var(--color-text-muted)]">
              {formatRupees(Math.max(budget - spent, 0))} remaining
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Finance Page ── */
export default function FinancePage() {
  const {
    monthlyTransactions, addTransaction, deleteTransaction,
    monthlyIncome, monthlyExpenses, balance,
    expensesByCategory, monthlyTrend,
    budget, updateBudget,
    EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const filteredTx = filterType === 'all'
    ? monthlyTransactions
    : monthlyTransactions.filter(t => t.type === filterType);

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  // Pie chart data for spending breakdown
  const pieData = expensesByCategory.map(c => ({
    name: c.label,
    value: c.amount,
    color: c.color,
  }));

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Finance</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{currentMonth}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus size={16} /> Add Transaction
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Income this month" value={monthlyIncome} color="#22c55e" delay={0.05} />
        <StatCard icon={TrendingDown} label="Expenses this month" value={monthlyExpenses} color="#ef4444" delay={0.1} />
        <StatCard icon={Wallet} label="Net balance" value={Math.abs(balance)} color={balance >= 0 ? '#9333ea' : '#ef4444'} delay={0.15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <BentoCard className="lg:col-span-2" delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Monthly Overview</h3>
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Last 6 months</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barGap={4}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickFormatter={formatRupees} width={74} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(147,51,234,0.05)', radius: 6 }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Spending Breakdown Pie */}
        <BentoCard delay={0.25}>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Spending Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {expensesByCategory.slice(0, 4).map(cat => (
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

      {/* Budget + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget Card */}
        <BentoCard delay={0.3}>
          <BudgetMeter budget={budget} spent={monthlyExpenses} onEditBudget={updateBudget} />
        </BentoCard>

        {/* Transactions List */}
        <BentoCard className="lg:col-span-2" delay={0.35} noPadding>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt size={15} className="text-[var(--color-text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Transactions</h3>
                <span className="text-[10px] text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded-md">{filteredTx.length}</span>
              </div>
              {/* Filter */}
              <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-[var(--color-border)]">
                {['all', 'income', 'expense'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all capitalize ${
                      filterType === f
                        ? 'text-white bg-purple-500/20'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {filteredTx.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                <AnimatePresence mode="popLayout">
                  {filteredTx.map((tx, i) => {
                    const cat = allCategories.find(c => c.id === tx.category);
                    const isIncome = tx.type === 'income';
                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-3 px-5 py-3 group hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: `${cat?.color || '#6b7280'}15` }}
                        >
                          {cat?.icon || '💰'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--color-text-primary)] truncate font-medium">{tx.description}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {cat?.label} · {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-[var(--color-text-primary)]'}`}>
                          {isIncome ? '+' : '-'}{formatRupees(tx.amount)}
                        </span>
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3"
                >
                  <Receipt size={22} className="text-purple-400" />
                </motion.div>
                <p className="text-xs text-[var(--color-text-muted)]">No transactions yet</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">Add your first one to get started</p>
              </div>
            )}
          </div>
        </BentoCard>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddTransactionModal
            onClose={() => setShowAddModal(false)}
            onAdd={addTransaction}
            expenseCategories={EXPENSE_CATEGORIES}
            incomeCategories={INCOME_CATEGORIES}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
