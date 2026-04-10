import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

/* ── Floating Orbs Background ── */
const FloatingOrbs = memo(function FloatingOrbs() {
  const orbs = [
    { size: 300, x: '15%', y: '20%', color: 'rgba(147, 51, 234, 0.08)', delay: 0 },
    { size: 200, x: '75%', y: '60%', color: 'rgba(168, 85, 247, 0.06)', delay: 1 },
    { size: 150, x: '60%', y: '15%', color: 'rgba(124, 58, 237, 0.07)', delay: 2 },
    { size: 250, x: '30%', y: '75%', color: 'rgba(217, 70, 239, 0.05)', delay: 0.5 },
    { size: 180, x: '85%', y: '30%', color: 'rgba(99, 102, 241, 0.06)', delay: 1.5 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            delay: orb.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
});

/* ── Particle field (memoized to avoid re-randomizing on parent re-render) ── */
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 2 + (((i * 7 + 3) % 11) / 11) * 3,
  left: ((i * 17 + 5) % 100),
  top: ((i * 23 + 11) % 100),
  yEnd: -40 - (((i * 13 + 7) % 11) / 11) * 60,
  xEnd: (((i * 19 + 2) % 11) / 11 - 0.5) * 30,
  duration: 3 + (((i * 11 + 1) % 11) / 11) * 4,
  delay: (((i * 29 + 3) % 11) / 11) * 5,
}));

const Particles = memo(function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-purple-400"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: 0,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [0, p.yEnd],
            x: [0, p.xEnd],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
});

/* ── Input Field ── */
function InputField({ icon: Icon, type: initialType, placeholder, value, onChange, hasToggle }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const type = hasToggle ? (showPwd ? 'text' : 'password') : initialType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 ${
        focused
          ? 'border-purple-500/50 bg-purple-500/5 shadow-sm shadow-purple-500/10'
          : 'border-[rgba(255,255,255,0.08)] bg-white/[0.03] hover:border-[rgba(255,255,255,0.15)]'
      }`}
    >
      <Icon size={18} className={`shrink-0 transition-colors duration-300 ${focused ? 'text-purple-400' : 'text-[#555]'}`} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent text-sm text-[#f5f5f5] placeholder:text-[#555] outline-none"
      />
      {hasToggle && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPwd(!showPwd)}
          className="shrink-0 text-[#555] hover:text-[#a0a0a0] transition-colors"
        >
          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </motion.div>
  );
}

/* ── Main Auth Page ── */
export default function AuthPage() {
  const { signup, login } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const result = isLogin ? login(email, password) : signup(name, email, password);

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden">
      <FloatingOrbs />
      <Particles />

      {/* Radial vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-xl shadow-purple-500/25 mb-5"
          >
            <Sparkles size={28} className="text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease }}
            className="text-3xl font-bold text-white mb-1.5 tracking-tight"
          >
            Life<span className="text-purple-400">OS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-[#a0a0a0] tracking-wide"
          >
            Your life, beautifully organized
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="rounded-2xl bg-[rgba(22,22,22,0.7)] backdrop-blur-2xl p-7 shadow-2xl gradient-border"
          style={{
            boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(147,51,234,0.06)',
          }}
        >
          {/* Tab switcher */}
          <div className="flex mb-6 p-1 rounded-xl bg-white/[0.03] border border-[rgba(255,255,255,0.05)]">
            {['Sign In', 'Sign Up'].map((label, idx) => {
              const active = idx === 0 ? isLogin : !isLogin;
              return (
                <button
                  key={label}
                  onClick={() => { if ((idx === 0) !== isLogin) switchMode(); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative ${
                    active ? 'text-white' : 'text-[#555] hover:text-[#a0a0a0]'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="authTab"
                      className="absolute inset-0 rounded-lg bg-purple-500/15 border border-purple-500/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Helpful hint */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.p
                key="hint-login"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-[#555] mb-4 px-1"
              >
                Don't have an account? Switch to <button onClick={switchMode} className="text-purple-400 hover:text-purple-300 transition-colors font-medium">Sign Up</button> to create one.
              </motion.p>
            ) : (
              <motion.p
                key="hint-signup"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-[#555] mb-4 px-1"
              >
                Already have an account? Switch to <button onClick={switchMode} className="text-purple-400 hover:text-purple-300 transition-colors font-medium">Sign In</button>.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3, ease }}
              onSubmit={handleSubmit}
              className="space-y-3.5"
            >
              {!isLogin && (
                <InputField
                  icon={User}
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              )}
              <InputField
                icon={Mail}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <InputField
                icon={Lock}
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                hasToggle
              />

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    className="text-xs text-red-400 px-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(147,51,234,0.25)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={16} />
                  </>
                )}
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 hover:opacity-100"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.button>
            </motion.form>
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-[#555] mt-6 flex items-center justify-center gap-1.5"
        >
          <Lock size={10} className="opacity-60" />
          Your data is stored locally on this device.
        </motion.p>
      </motion.div>
    </div>
  );
}
