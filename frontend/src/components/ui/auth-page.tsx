import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Bell,
  User as UserIcon,
  Lock,
  Loader2,
  ArrowRight,
  X,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthPageProps {
  authMode: 'login' | 'signup';
  authEmail: string;
  authPassword: string;
  authError: string;
  authSuccess: string;
  authLoading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  onBack: () => void;
}

// Animated dot grid canvas
const DotGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const DOT_GAP = 28;
    let mouse = { x: -9999, y: -9999 };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', onMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / DOT_GAP) + 1;
      const rows = Math.ceil(canvas.height / DOT_GAP) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * DOT_GAP;
          const y = r * DOT_GAP;
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / 140);
          const alpha = 0.12 + proximity * 0.55;
          const size = 1 + proximity * 1.2;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${proximity > 0.3 ? '96,165,250' : '100,116,139'},${alpha})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
    />
  );
};

const FEATURES = [
  {
    icon: <TrendingUp style={{ width: 16, height: 16 }} />,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.2)',
    title: 'Real-time Market Data',
    desc: 'Live quotes from NASDAQ & NSE markets',
  },
  {
    icon: <Sparkles style={{ width: 16, height: 16 }} />,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    border: 'rgba(129,140,248,0.2)',
    title: 'ML-Powered Predictions',
    desc: 'Next-day price forecasts via LSTM models',
  },
  {
    icon: <Bell style={{ width: 16, height: 16 }} />,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.2)',
    title: 'Daily Digest Emails',
    desc: 'Personalized forecasts every morning at 9 AM',
  },
];

import { FallingCurrencyPattern } from './falling-currency-pattern';

export default function AuthPage({
  authMode,
  authEmail,
  authPassword,
  authError,
  authSuccess,
  authLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
  onBack,
}: AuthPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#060912',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <FallingCurrencyPattern />

      {/* ===== LEFT PANEL — Brand ===== */}
      <div style={{
        display: 'none',
        flex: '1 1 0',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #060912 0%, #0d1220 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
        className="auth-left-panel"
      >
        <DotGrid />

        {/* Gradient orbs */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          animation: 'float 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '0%', right: '-5%',
          width: '55%', height: '55%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          animation: 'float 13s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '30%',
          width: '40%', height: '40%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          animation: 'float 8s ease-in-out 2s infinite',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          padding: '2.5rem',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 900, color: '#fff',
              boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              flexShrink: 0,
            }}>
              ST
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#f0f6ff', letterSpacing: '-0.01em' }}>
              Stock<span style={{ color: '#60a5fa' }}>Track</span>
            </span>
          </div>

          {/* Center content */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.85rem',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 700,
              color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '1.5rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
              AI-Powered · Real-time
            </div>

            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#f0f6ff',
              marginBottom: '1rem',
            }}>
              Your intelligent<br />
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                stock dashboard
              </span>
            </h2>

            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '380px', marginBottom: '2.5rem' }}>
              Track markets, get AI-driven next-day predictions, and receive personalized daily forecasts — all in one place.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{
                    width: '34px', height: '34px', flexShrink: 0,
                    background: f.bg,
                    border: `1px solid ${f.border}`,
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: f.color,
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '0.15rem' }}>{f.title}</p>
                    <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div style={{
            padding: '1.25rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
          }}>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.65, fontStyle: 'italic' }}>
              "StockTrack's ML predictions have transformed how I approach market timing — the next-day forecasts are remarkably accurate."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.85rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 800, color: '#fff',
              }}>
                RK
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>Rahul K.</p>
                <p style={{ fontSize: '0.68rem', color: '#475569' }}>Retail Investor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div style={{
        flex: '1 1 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #060912 0%, #0a0f1e 100%)',
      }}>
        {/* Subtle top-right glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '40%', height: '40%',
          background: 'radial-gradient(ellipse at top right, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '35%', height: '35%',
          background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Mobile logo */}
        <div className="auth-mobile-logo" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #2563eb, #10b981)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
          }}>
            ST
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#f0f6ff' }}>
            Stock<span style={{ color: '#60a5fa' }}>Track</span>
          </span>
        </div>

        {/* Form card */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(10,16,31,0.7)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '24px',
          padding: '2.25rem',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 0 0 1px rgba(59,130,246,0.05), 0 40px 100px rgba(0,0,0,0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top rainbow line */}
          <div style={{
            position: 'absolute', top: 0, insetInline: 0,
            height: '1.5px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #8b5cf6 100%)',
            borderRadius: '24px 24px 0 0',
          }} />

          {/* Heading */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: '1.55rem',
              color: '#f0f6ff',
              letterSpacing: '-0.02em',
              marginBottom: '0.4rem',
            }}>
              {authMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize: '0.845rem', color: '#475569', lineHeight: 1.5 }}>
              {authMode === 'login'
                ? 'Sign in to access your stock dashboard and AI predictions.'
                : 'Start tracking markets with AI-powered price forecasts.'}
            </p>
          </div>

          {/* Alerts */}
          {authError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '0.83rem',
              fontWeight: 500,
              marginBottom: '1rem',
            }}>
              <X style={{ width: 14, height: 14, flexShrink: 0 }} />
              {authError}
            </div>
          )}
          {authSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px',
              color: '#6ee7b7',
              fontSize: '0.83rem',
              fontWeight: 500,
              marginBottom: '1rem',
            }}>
              <Check style={{ width: 14, height: 14, flexShrink: 0 }} />
              {authSuccess}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email */}
            <div>
              <label htmlFor="auth-email" style={{
                display: 'block',
                fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#475569',
                marginBottom: '0.5rem',
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  width: 15, height: 15,
                  color: focusedField === 'email' ? '#60a5fa' : '#334155',
                  pointerEvents: 'none',
                  transition: 'color 0.2s',
                }} />
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(2,6,23,0.6)',
                    border: `1px solid ${focusedField === 'email' ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px',
                    padding: '0.8rem 1rem 0.8rem 2.65rem',
                    color: '#f0f6ff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" style={{
                display: 'block',
                fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#475569',
                marginBottom: '0.5rem',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  width: 15, height: 15,
                  color: focusedField === 'password' ? '#60a5fa' : '#334155',
                  pointerEvents: 'none',
                  transition: 'color 0.2s',
                }} />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(2,6,23,0.6)',
                    border: `1px solid ${focusedField === 'password' ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px',
                    padding: '0.8rem 2.75rem 0.8rem 2.65rem',
                    color: '#f0f6ff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#334155',
                    cursor: 'pointer', padding: '2px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 14, height: 14 }} />
                    : <Eye style={{ width: 14, height: 14 }} />
                  }
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={authLoading}
              id="auth-submit"
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.9rem',
                marginTop: '0.25rem',
                background: authMode === 'login'
                  ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: `1px solid ${authMode === 'login' ? 'rgba(59,130,246,0.4)' : 'rgba(16,185,129,0.4)'}`,
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: authMode === 'login'
                  ? '0 4px 20px rgba(59,130,246,0.25)'
                  : '0 4px 20px rgba(16,185,129,0.2)',
                letterSpacing: '0.01em',
              }}
            >
              {authLoading
                ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                : authMode === 'login'
                  ? <><span>Sign In</span><ArrowRight style={{ width: 15, height: 15 }} /></>
                  : <><span>Create Account</span><ArrowRight style={{ width: 15, height: 15 }} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Toggle mode */}
          <button
            onClick={onToggleMode}
            id="auth-toggle-mode"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.8rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
              (e.target as HTMLButtonElement).style.color = '#f0f6ff';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
              (e.target as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              onClick={onBack}
              id="auth-back"
              style={{
                background: 'none', border: 'none',
                color: '#334155', fontSize: '0.78rem',
                cursor: 'pointer', fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#60a5fa'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#334155'; }}
            >
              ← Back to homepage
            </button>
          </div>
        </div>

        {/* Bottom fine print */}
        <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.72rem', color: '#1e293b', maxWidth: '360px' }}>
          By continuing, you agree to StockTrack's terms. Predictions are for informational purposes only.
        </p>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .auth-left-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
