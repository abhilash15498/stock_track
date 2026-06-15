import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Sparkles, ArrowRight, BarChart3, Bell, Shield, Check, Zap, Crown } from 'lucide-react';
import Globe from 'react-globe.gl';

interface HeroFuturisticProps {
  onExplore: () => void;
}

// ─────────────────────────────────────────────────────────
// PARTICLE CANVAS
// ─────────────────────────────────────────────────────────
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animFrameId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['rgba(59,130,246,', 'rgba(16,185,129,', 'rgba(139,92,246,'];
    for (let i = 0; i < 70; i++) {
      particles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, size: Math.random() * 1.4 + 0.3, alpha: Math.random() * 0.4 + 0.1, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        particles.slice(i + 1, i + 5).forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) { ctx.beginPath(); ctx.strokeStyle = `${p.color}${(1 - dist / 110) * 0.1})`; ctx.lineWidth = 0.4; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        });
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `${p.color}${p.alpha})`; ctx.fill();
      });
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animFrameId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
};

// ─────────────────────────────────────────────────────────
// 3D INTERACTIVE GLOBE
// ─────────────────────────────────────────────────────────
interface GeoPoint { lat: number; lon: number; label: string; currency: string; color: string; }

const FINANCIAL_CENTERS: GeoPoint[] = [
  { lat: 40.71, lon: -74.01, label: 'New York', currency: '$', color: '#4261de' },
  { lat: 51.51, lon: -0.12, label: 'London', currency: '£', color: '#34d399' },
  { lat: 35.69, lon: 139.69, label: 'Tokyo', currency: '¥', color: '#f472b6' },
  { lat: 19.08, lon: 72.88, label: 'Mumbai', currency: '₹', color: '#fb923c' },
  { lat: 50.11, lon: 8.68, label: 'Frankfurt', currency: '€', color: '#a78bfa' },
  { lat: 31.23, lon: 121.47, label: 'Shanghai', currency: '¥', color: '#38bdf8' },
  { lat: 25.20, lon: 55.27, label: 'Dubai', currency: 'د.إ', color: '#facc15' },
  { lat: -33.87, lon: 151.21, label: 'Sydney', currency: 'A$', color: '#4ade80' },
  { lat: 1.35, lon: 103.82, label: 'Singapore', currency: 'S$', color: '#e879f9' },
  { lat: 43.65, lon: -79.38, label: 'Toronto', currency: 'C$', color: '#67e8f9' },
  { lat: 48.85, lon: 2.35, label: 'Paris', currency: '€', color: '#a78bfa' },
  { lat: 22.32, lon: 114.17, label: 'Hong Kong', currency: 'HK$', color: '#f87171' },
];

const InteractiveGlobe = () => {
  const globeEl = useRef<any>(null);

  const handleGlobeReady = () => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI * 0.2;
      controls.maxPolarAngle = Math.PI * 0.8;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Atmospheric glow ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px', height: '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, transparent 47%, rgba(59,130,246,0.12) 55%, rgba(16,185,129,0.06) 65%, transparent 72%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <Globe
        ref={globeEl}
        width={480}
        height={480}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="rgba(59,130,246,0.6)"
        atmosphereAltitude={0.18}
        backgroundColor="rgba(0,0,0,0)"
        onGlobeReady={handleGlobeReady}
        htmlElementsData={FINANCIAL_CENTERS}
        htmlAltitude={0.01}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              display: flex; flex-direction: column; align-items: center; cursor: pointer;
              transform: translate(-50%, -50%);
              pointer-events: auto;
              transition: transform 0.2s;
            ">
              <div style="
                width: 9px; height: 9px; border-radius: 50%;
                background: ${d.color}; box-shadow: 0 0 10px ${d.color}, 0 0 20px ${d.color}55;
                border: 2px solid rgba(255,255,255,0.9);
                animation: pulse-dot 2s ease-in-out infinite;
              "></div>
              <div style="
                margin-top: 5px; padding: 2px 7px; border-radius: 5px;
                background: rgba(2,6,23,0.9); border: 1px solid ${d.color}66;
                color: ${d.color}; font-size: 10.5px; font-weight: 800; white-space: nowrap;
                backdrop-filter: blur(8px); font-family: 'Space Grotesk', sans-serif;
                letter-spacing: 0.03em;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
              ">
                ${d.currency} ${d.label}
              </div>
            </div>
          `;
          return el;
        }}
      />
      {/* Drag hint */}
      <p style={{
        textAlign: 'center', marginTop: '0.5rem',
        fontSize: '0.65rem', color: '#334155',
        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        pointerEvents: 'none',
      }}>
        ↻ Drag to rotate
      </p>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );

};

// ─────────────────────────────────────────────────────────
// TICKER DATA
// ─────────────────────────────────────────────────────────
const TICKER_DATA = [
  { symbol: 'AAPL', price: '$194.82', change: '+1.24%', up: true },
  { symbol: 'MSFT', price: '$418.35', change: '+0.87%', up: true },
  { symbol: 'GOOGL', price: '$176.50', change: '-0.34%', up: false },
  { symbol: 'TSLA', price: '$251.14', change: '+2.18%', up: true },
  { symbol: 'NVDA', price: '$127.25', change: '+3.42%', up: true },
  { symbol: 'META', price: '$558.30', change: '-0.95%', up: false },
  { symbol: 'AMZN', price: '$198.40', change: '+1.07%', up: true },
  { symbol: 'RELIANCE.NS', price: '₹2,847', change: '+0.63%', up: true },
  { symbol: 'TCS.NS', price: '₹3,892', change: '-0.41%', up: false },
  { symbol: 'INFOSYS.NS', price: '₹1,648', change: '+1.15%', up: true },
];

// ─────────────────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: <BarChart3 className="w-6 h-6" />, color: 'from-blue-600/20 to-blue-500/10', iconColor: '#60a5fa', title: 'Real-time Quotes', desc: 'Live market data for NASDAQ and NSE stocks, updated throughout trading hours.' },
  { icon: <Sparkles className="w-6 h-6" />, color: 'from-emerald-600/20 to-emerald-500/10', iconColor: '#34d399', title: 'AI Predictions', desc: 'ML-powered next-day price forecasts using our custom LSTM model trained on historical data.' },
  { icon: <Bell className="w-6 h-6" />, color: 'from-violet-600/20 to-violet-500/10', iconColor: '#a78bfa', title: 'Daily Digest', desc: 'Automated email newsletter with personalized forecasts for your watchlist every morning.' },
  { icon: <Shield className="w-6 h-6" />, color: 'from-rose-600/20 to-rose-500/10', iconColor: '#fb7185', title: 'Secure Watchlist', desc: 'Supabase-powered authentication and cloud watchlist, synced across all your devices.' },
];

// ─────────────────────────────────────────────────────────
// PRICING PLANS
// ─────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    icon: <Zap style={{ width: 20, height: 20 }} />,
    price: 'Free',
    period: 'forever',
    color: '#60a5fa',
    glow: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.2)',
    features: ['5 watchlist stocks', 'Daily digest email', 'Real-time quotes', 'Basic AI forecast', 'NASDAQ & NSE data'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    icon: <Sparkles style={{ width: 20, height: 20 }} />,
    price: '$9',
    period: 'per month',
    color: '#34d399',
    glow: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.35)',
    badge: 'Most Popular',
    features: ['Unlimited watchlist', 'Priority AI predictions', 'Advanced analytics', 'Price alerts & SMS', 'Multi-market access', 'Portfolio tracking'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    icon: <Crown style={{ width: 20, height: 20 }} />,
    price: '$29',
    period: 'per month',
    color: '#a78bfa',
    glow: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.2)',
    features: ['Everything in Pro', 'API access', 'Custom ML models', 'Dedicated support', 'Team accounts', 'White-label reports'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
import { FallingCurrencyPattern } from './falling-currency-pattern';

export default function HeroFuturistic({ onExplore }: HeroFuturisticProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f0f6ff', overflowX: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <FallingCurrencyPattern />
      <div className="animated-bg" />
      <div className="grid-overlay" />

      {/* ═══════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════ */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <ParticleCanvas />
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: '3rem',
          alignItems: 'center',
        }}
          className="hero-grid"
        >
          {/* LEFT — Text + CTAs */}
          <div className="hero-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Badge */}
            <div className="hero-badge" style={{ alignSelf: 'flex-start' }}>
              <span className="hero-badge-dot" />
              AI-Powered Stock Intelligence
            </div>

            {/* HEADLINE — updated motto */}
            <h1 className="hero-title" style={{ textAlign: 'left', fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
              Track Smarter,
              <br />
              Predict{' '}
              <span className="gradient-text">Future</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle" style={{ textAlign: 'left', maxWidth: '460px' }}>
              Real-time market data meets machine learning. Monitor global stocks,
              get AI-driven next-day predictions, and receive personalized daily digests.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="hero-cta-primary" onClick={onExplore} id="hero-get-started">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </button>
              <button className="hero-cta-secondary" onClick={onExplore} id="hero-view-dashboard">
                View Dashboard
              </button>
            </div>

            {/* Stats strip */}
            <div style={{
              display: 'flex', gap: '2rem', flexWrap: 'wrap',
              padding: '1.25rem 1.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
            }}>
              {[{ num: '500+', label: 'Stocks Tracked' }, { num: '94%', label: 'ML Accuracy' }, { num: '24/7', label: 'Live Data' }].map(s => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span className="stat-number" style={{ fontSize: '1.4rem' }}>{s.num}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — 3D Globe */}
          <div className="hero-fade-in-delayed" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <InteractiveGlobe />
            {/* Currency legend */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center',
              maxWidth: '420px',
            }}>
              {FINANCIAL_CENTERS.slice(0, 8).map(fc => (
                <div key={fc.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${fc.color}33`,
                  borderRadius: '999px',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  <span style={{ color: fc.color }}>{fc.currency}</span>
                  <span style={{ color: '#475569' }}>{fc.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
          opacity: 0.5, animation: 'heroFadeIn 1s 3s both',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155' }}>Scroll to explore</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: 'bounceArrow 2s ease-in-out infinite' }}>
            <path d="M10 4v12M4 10l6 6 6-6" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          LIVE TICKER
      ═══════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', padding: '0.85rem 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="ticker-track">
            {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
              <div className="ticker-item" key={i}>
                <span style={{ color: '#f0f6ff', fontWeight: 700 }}>{t.symbol}</span>
                <span style={{ color: 'var(--text-muted)' }}>{t.price}</span>
                <span className={t.up ? 'up' : 'down'} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {t.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {t.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="section-pill" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', margin: '0 auto 1rem' }}>
            <Sparkles className="w-3 h-3" /> Features
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f6ff', marginBottom: '0.75rem' }}>
            Everything you need to track markets
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Combining real-time data with AI forecasting to give you an edge in every decision.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon" style={{ background: `linear-gradient(135deg, ${f.color})`, color: f.iconColor, border: `1px solid ${f.iconColor}22` }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#f0f6ff', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PRICING PLANS
      ═══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="section-pill" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', margin: '0 auto 1rem' }}>
            <Zap style={{ width: 12, height: 12 }} /> Pricing
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f6ff', marginBottom: '0.75rem' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                position: 'relative',
                borderRadius: plan.highlighted ? '24px' : '20px',
                border: `1px solid ${plan.border}`,
                background: plan.highlighted
                  ? `linear-gradient(145deg, rgba(10,20,38,0.98), rgba(8,18,32,0.98))`
                  : 'rgba(10,16,31,0.65)',
                backdropFilter: 'blur(24px)',
                padding: '2rem',
                boxShadow: plan.highlighted
                  ? `0 0 0 1px ${plan.border}, 0 30px 80px rgba(0,0,0,0.5), 0 0 60px ${plan.glow}`
                  : '0 8px 40px rgba(0,0,0,0.3)',
                transform: plan.highlighted ? 'scale(1.04)' : 'none',
                transition: 'transform 0.3s, box-shadow 0.3s',
                overflow: 'hidden',
              }}
            >
              {/* Top gradient bar */}
              <div style={{ position: 'absolute', top: 0, insetInline: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }} />

              {/* Popular badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  padding: '0.2rem 0.7rem',
                  background: `${plan.color}22`,
                  border: `1px solid ${plan.color}55`,
                  borderRadius: '999px',
                  fontSize: '0.68rem', fontWeight: 800,
                  color: plan.color,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Icon + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
                  background: `${plan.color}18`,
                  border: `1px solid ${plan.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: plan.color,
                }}>
                  {plan.icon}
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#f0f6ff' }}>{plan.name}</h3>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 900,
                    fontSize: '2.8rem',
                    letterSpacing: '-0.03em',
                    background: `linear-gradient(135deg, #f0f6ff, ${plan.color})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1,
                  }}>
                    {plan.price}
                  </span>
                  {plan.period !== 'forever' && (
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>/{plan.period}</span>
                  )}
                </div>
                {plan.period === 'forever' && (
                  <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>No credit card required</span>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.75rem' }}>
                {plan.features.map(feat => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.87rem', color: '#94a3b8' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      background: `${plan.color}18`,
                      border: `1px solid ${plan.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check style={{ width: 10, height: 10, color: plan.color }} />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={onExplore}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: plan.highlighted ? 'none' : `1px solid ${plan.color}44`,
                  background: plan.highlighted
                    ? `linear-gradient(135deg, ${plan.color}cc, ${plan.color})`
                    : `${plan.color}10`,
                  color: plan.highlighted ? '#fff' : plan.color,
                  fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: plan.highlighted ? `0 6px 25px ${plan.glow}` : 'none',
                  transition: 'all 0.25s',
                }}
                id={`pricing-cta-${plan.name.toLowerCase()}`}
              >
                {plan.cta} {plan.highlighted && <ArrowRight style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.77rem', color: '#1e293b' }}>
          All plans include SSL security · Cancel anytime · Prices shown are indicative
        </p>
      </section>

      {/* ═══════════════════════════════════════════════
          STOCK PREVIEW
      ═══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        <div style={{ background: 'rgba(10,16,31,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(24px)', position: 'relative', overflow: 'hidden' }}>

          {/* ── Floating currency background symbols ── */}
          {[
            { s: '$',  x: 8,  y: 15, size: 4.5, color: '#34d399', delay: 0   },
            { s: '₹',  x: 18, y: 60, size: 3.8, color: '#f87171', delay: 2   },
            { s: '€',  x: 30, y: 25, size: 5.2, color: '#60a5fa', delay: 4   },
            { s: '¥',  x: 45, y: 70, size: 4.0, color: '#a78bfa', delay: 1   },
            { s: '£',  x: 60, y: 20, size: 3.5, color: '#fb923c', delay: 3   },
            { s: '₿',  x: 72, y: 55, size: 4.8, color: '#facc15', delay: 5   },
            { s: '$',  x: 82, y: 10, size: 3.2, color: '#f87171', delay: 2.5 },
            { s: '₹',  x: 90, y: 75, size: 4.2, color: '#34d399', delay: 1.5 },
            { s: '€',  x: 5,  y: 80, size: 3.0, color: '#60a5fa', delay: 3.5 },
            { s: '¥',  x: 55, y: 40, size: 5.0, color: '#a78bfa', delay: 0.5 },
            { s: '£',  x: 38, y: 85, size: 3.3, color: '#fb923c', delay: 4.5 },
            { s: '₿',  x: 95, y: 45, size: 3.8, color: '#facc15', delay: 2.2 },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                fontSize: `${item.size}rem`,
                fontWeight: 900,
                color: item.color,
                opacity: 0.12,
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                userSelect: 'none',
                pointerEvents: 'none',
                animation: `floatCurrency ${8 + i * 0.7}s ease-in-out ${item.delay}s infinite`,
                lineHeight: 1,
                zIndex: 0,
              }}
            >
              {item.s}
            </div>
          ))}

          {/* Card content on top */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#f0f6ff' }}>Sample Dashboard Preview</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Sign in to see your personalized watchlist</p>
              </div>
              <button className="btn-primary" onClick={onExplore} id="preview-get-started">Get Started <ArrowRight className="w-4 h-4" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {TICKER_DATA.slice(0, 6).map((t, i) => (
                <div key={i} className="stock-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.symbol.includes('.NS') ? 'NSE' : 'NASDAQ'}
                      </span>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#f0f6ff', marginTop: '0.35rem' }}>{t.symbol}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.22rem 0.55rem', borderRadius: '6px', background: t.up ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: t.up ? '#34d399' : '#fb7185', border: `1px solid ${t.up ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {t.up ? '▲' : '▼'} {t.change}
                    </span>
                  </div>
                  <div className="price-display" style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>{t.price}</div>
                  <div className={`prediction-badge ${t.up ? 'up' : 'down'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Sparkles className="w-3 h-3" /><span>AI Forecast</span></div>
                    <span style={{ fontWeight: 800 }}>{t.up ? '+' : ''}{(parseFloat(t.change) * 0.9).toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA FOOTER
      ═══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '4rem 1.5rem 6rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#f0f6ff', lineHeight: 1.15, marginBottom: '1rem' }}>Ready to invest smarter?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>Join StockTrack today — it's free. AI predictions and insights delivered to your inbox.</p>
        <button className="hero-cta-primary" onClick={onExplore} id="cta-launch-app" style={{ fontSize: '1rem', padding: '1rem 2.25rem' }}>
          Launch App <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      <footer style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        © 2026 StockTrack. AI predictions are for informational purposes only.
      </footer>

      {/* Responsive styles */}
      <style>{`
        .hero-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-grid > div:last-child { order: -1; }
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; } to { opacity: 0.5; }
        }
        @keyframes heroContentFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes floatCurrency {
          0%, 100% { transform: translateY(0px) rotate(-5deg); opacity: 0.10; }
          33% { transform: translateY(-18px) rotate(3deg); opacity: 0.16; }
          66% { transform: translateY(-8px) rotate(-2deg); opacity: 0.13; }
        }
        .hero-fade-in {
          animation: heroContentFadeIn 0.6s ease-out both;
        }
        .hero-fade-in-delayed {
          animation: heroContentFadeIn 0.8s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}
