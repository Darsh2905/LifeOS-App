import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Check, X as XIcon,
  MailCheck, RefreshCw, CheckCircle2
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

/* ── Floating Orbs Background ── */
const FloatingOrbs = memo(function FloatingOrbs() {
  const orbs = [
    { size: 300, x: '15%', y: '20%', color: 'rgba(147, 51, 234, 0.08)', delay: 0 },
    { size: 200, x: '75%', y: '60%', color: 'rgba(168, 85, 247, 0.06)', delay: 1 },
    { size: 250, x: '30%', y: '75%', color: 'rgba(217, 70, 239, 0.05)', delay: 0.5 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            willChange: 'transform',
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
          }}
          transition={{
            duration: 16 + i * 3,
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
const PARTICLES = Array.from({ length: 6 }, (_, i) => ({
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

/* ── Password strength meter ── */
function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Letter', pass: /[a-zA-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Symbol (recommended)', pass: /[^a-zA-Z0-9]/.test(password), optional: true },
  ];
  const score = checks.filter(c => c.pass && !c.optional).length + (checks[3].pass ? 1 : 0);
  const tiers = [
    { label: 'Too weak', color: 'bg-red-500', text: 'text-red-400' },
    { label: 'Weak', color: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'Okay', color: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'Excellent', color: 'bg-purple-500', text: 'text-purple-400' },
  ];
  const tier = tiers[Math.min(score, tiers.length - 1)];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 px-1"
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              initial={false}
              animate={{ width: score > i ? '100%' : '0%' }}
              transition={{ duration: 0.25 }}
              className={`h-full ${tier.color}`}
            />
          </div>
        ))}
        <span className={`ml-2 text-[10px] font-semibold uppercase tracking-widest ${tier.text}`}>{tier.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 ${c.pass ? 'text-emerald-400' : 'text-[#555]'}`}>
            {c.pass ? <Check size={11} /> : <XIcon size={11} />}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}


/* ── Email Verification Screen ── */
function VerificationScreen({ email, onBackToLogin }) {
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const resend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const data = await api.post('/auth/resend-verification', { email });
      setResendMsg(data.message || 'Verification email sent!');
      if (data.autoVerified) {
        setTimeout(() => onBackToLogin(), 1500);
      }
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease }}
      className="text-center py-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 mb-5"
      >
        <MailCheck size={30} className="text-purple-400" />
      </motion.div>

      <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
      <p className="text-sm text-[#a0a0a0] mb-1 leading-relaxed">
        We've sent a verification link to
      </p>
      <p className="text-sm font-semibold text-purple-400 mb-4">{email}</p>
      <p className="text-xs text-[#555] mb-6 leading-relaxed">
        Click the link in the email to verify your account.<br />
        The link expires in 24 hours.
      </p>

      {/* Resend */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={resend}
        disabled={resending}
        className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] border border-[rgba(255,255,255,0.08)] text-[#a0a0a0] hover:text-white hover:border-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
      >
        <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
        {resending ? 'Sending...' : 'Resend verification email'}
      </motion.button>

      <AnimatePresence>
        {resendMsg && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-emerald-400 mt-3"
          >
            {resendMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={onBackToLogin}
        className="mt-5 text-xs text-[#555] hover:text-purple-400 transition-colors"
      >
        ← Back to sign in
      </button>
    </motion.div>
  );
}


/* ── Email Verified Success Screen ── */
function VerifiedSuccess({ onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease }}
      className="text-center py-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 mb-5"
      >
        <CheckCircle2 size={30} className="text-emerald-400" />
      </motion.div>

      <h2 className="text-lg font-bold text-white mb-2">Email Verified! ✨</h2>
      <p className="text-sm text-[#a0a0a0] mb-6">Your account is ready to go.</p>

      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(147,51,234,0.25)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
      >
        Continue to LifeOS
        <ArrowRight size={16} />
      </motion.button>
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

  // Verification states
  const [verificationEmail, setVerificationEmail] = useState(null); // email awaiting verification
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Handle ?token= query param for email verification links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    (async () => {
      try {
        const data = await api.get(`/auth/verify?token=${token}`);
        if (data.token && data.user) {
          // Store token and show success
          localStorage.setItem('lifeos-token', data.token);
          setVerifiedSuccess(true);
        }
      } catch (err) {
        setError(err.message || 'Verification failed.');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    })();
  }, []);

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
    if (!isLogin) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must contain a letter and a number.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (!result.success) {
          // Check if it's a verification-required error
          if (result.error?.includes('verify your email')) {
            setVerificationEmail(email.trim().toLowerCase());
          } else {
            setError(result.error);
          }
          setIsSubmitting(false);
        }
      } else {
        const result = await signup(name, email, password);
        if (!result.success) {
          // Check if signup requires verification
          if (result.requiresVerification) {
            setVerificationEmail(result.email || email.trim().toLowerCase());
          } else {
            setError(result.error);
          }
          setIsSubmitting(false);
        }
      }
    } catch {
      setError('Something went wrong. Is the server running?');
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setVerificationEmail(null);
  };

  const backToLogin = () => {
    setVerificationEmail(null);
    setIsLogin(true);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
      <FloatingOrbs />
      <Particles />

      {/* Mesh gradient background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(147, 51, 234, 0.15), transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.1), transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(236, 72, 153, 0.08), transparent 50%)
          `,
        }}
      />

      {/* Radial vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
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
            className="text-3xl heading-display text-white mb-1.5"
          >
            Life<span className="heading-gradient">OS</span>
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
          className="rounded-2xl glass-premium p-7 gradient-border"
          style={{
            boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(147,51,234,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <AnimatePresence mode="wait">
            {/* Verified Success Screen */}
            {verifiedSuccess ? (
              <VerifiedSuccess
                key="verified"
                onContinue={() => window.location.reload()}
              />
            ) : verificationEmail ? (
              /* Verification Pending Screen */
              <VerificationScreen
                key="verification"
                email={verificationEmail}
                onBackToLogin={backToLogin}
              />
            ) : (
              /* Normal Login/Signup Form */
              <motion.div key="auth-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

                    <AnimatePresence>
                      {!isLogin && password.length > 0 && (
                        <PasswordStrength password={password} />
                      )}
                    </AnimatePresence>

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
                    </motion.button>
                  </motion.form>
                </AnimatePresence>
              </motion.div>
            )}
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
          Your data is securely stored and encrypted.
        </motion.p>
      </motion.div>
    </div>
  );
}
