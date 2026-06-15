import { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Sparkles, ArrowRight, BarChart3, Bell, Shield, Check, Zap, Crown } from 'lucide-react';

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

function latLonToXYZ(lat: number, lon: number, rotY: number, rotX: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  // Rotate around Y axis
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  // Rotate around X axis
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  return { x: x1, y: y2, z: z2 };
}

const InteractiveGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotY = useRef(0.3);
  const rotX = useRef(0.15);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const hoveredIdx = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; currency: string; color: string } | null>(null);
  const rafId = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.38;

    ctx.clearRect(0, 0, W, H);

    // --- Atmosphere glow ---
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.18);
    atmo.addColorStop(0, 'rgba(59,130,246,0.08)');
    atmo.addColorStop(0.6, 'rgba(59,130,246,0.04)');
    atmo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill();

    // --- Globe body ---
    const bodyGrad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.05, cx, cy, R);
    bodyGrad.addColorStop(0, 'rgba(20,30,58,0.95)');
    bodyGrad.addColorStop(0.5, 'rgba(10,16,40,0.97)');
    bodyGrad.addColorStop(1, 'rgba(5,8,25,0.99)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Clip to sphere
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    // --- Lat/Lon grid lines ---
    ctx.lineWidth = 0.5;
    // Latitude circles
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: { x: number; y: number; z: number }[] = [];
      for (let lon = -180; lon <= 180; lon += 4) {
        pts.push(latLonToXYZ(lat, lon, rotY.current, rotX.current, R));
      }
      ctx.beginPath();
      let first = true;
      pts.forEach(p => {
        const sx = cx + p.x, sy = cy - p.y;
        if (p.z > 0) {
          if (first) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
          first = false;
        } else {
          first = true;
        }
      });
      ctx.strokeStyle = 'rgba(59,130,246,0.09)';
      ctx.stroke();
    }
    // Longitude lines
    for (let lon = -180; lon < 180; lon += 20) {
      const pts: { x: number; y: number; z: number }[] = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        pts.push(latLonToXYZ(lat, lon, rotY.current, rotX.current, R));
      }
      ctx.beginPath();
      let first = true;
      pts.forEach(p => {
        const sx = cx + p.x, sy = cy - p.y;
        if (p.z > 0) {
          if (first) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
          first = false;
        } else {
          first = true;
        }
      });
      ctx.strokeStyle = 'rgba(59,130,246,0.06)';
      ctx.stroke();
    }

    // --- Continent dots (randomly seeded, stable) ---
    // We use a simple dot distribution representing continents
    const LAND_COORDS = [
      // North America
      ...Array.from({ length: 40 }, (_, i) => ({ lat: 35 + Math.sin(i * 1.7) * 18, lon: -95 + Math.cos(i * 2.1) * 35 })),
      // Europe
      ...Array.from({ length: 28 }, (_, i) => ({ lat: 50 + Math.sin(i * 1.3) * 8, lon: 15 + Math.cos(i * 1.9) * 18 })),
      // Asia
      ...Array.from({ length: 55 }, (_, i) => ({ lat: 40 + Math.sin(i * 0.9) * 20, lon: 90 + Math.cos(i * 1.1) * 40 })),
      // South America
      ...Array.from({ length: 25 }, (_, i) => ({ lat: -15 + Math.sin(i * 1.4) * 18, lon: -55 + Math.cos(i * 1.7) * 15 })),
      // Africa
      ...Array.from({ length: 30 }, (_, i) => ({ lat: 5 + Math.sin(i * 1.2) * 25, lon: 20 + Math.cos(i * 1.5) * 20 })),
      // Australia
      ...Array.from({ length: 15 }, (_, i) => ({ lat: -28 + Math.sin(i * 1.6) * 8, lon: 135 + Math.cos(i * 2) * 12 })),
      // India
      ...Array.from({ length: 14 }, (_, i) => ({ lat: 20 + Math.sin(i * 1.5) * 8, lon: 80 + Math.cos(i * 1.3) * 8 })),
    ];
    LAND_COORDS.forEach(({ lat, lon }) => {
      const p = latLonToXYZ(lat, lon, rotY.current, rotX.current, R);
      if (p.z < 0) return;
      const bright = 0.3 + (p.z / R) * 0.4;
      const sx = cx + p.x, sy = cy - p.y;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(96,165,250,${bright * 0.55})`;
      ctx.fill();
    });

    ctx.restore(); // End clip

    // --- Globe rim ---
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59,130,246,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular highlight
    const hiGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 0, cx - R * 0.1, cy - R * 0.1, R * 0.65);
    hiGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    hiGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hiGrad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // --- Financial center markers ---
    FINANCIAL_CENTERS.forEach((fc, idx) => {
      const p = latLonToXYZ(fc.lat, fc.lon, rotY.current, rotX.current, R);
      if (p.z <= 0) return; // Behind globe
      const visibility = p.z / R;
      const sx = cx + p.x;
      const sy = cy - p.y;
      const isHovered = hoveredIdx.current === idx;
      const dotR = isHovered ? 6.5 : 4.5;

      // Pulse ring
      if (visibility > 0.25) {
        ctx.beginPath();
        ctx.arc(sx, sy, dotR + 5 + Math.sin(Date.now() / 700 + idx) * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = `${fc.color}${Math.floor(visibility * 35).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Dot
      const grd = ctx.createRadialGradient(sx - 1, sy - 1, 0, sx, sy, dotR);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.4, fc.color);
      grd.addColorStop(1, `rgba(${hexToRgb(fc.color)},0.53)`);
      ctx.beginPath();
      ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.globalAlpha = 0.4 + visibility * 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Currency label
      if (visibility > 0.35) {
        const labelAlpha = Math.min(1, (visibility - 0.35) / 0.4);
        ctx.font = `bold ${isHovered ? 13 : 11}px 'Space Grotesk', Inter, sans-serif`;
        ctx.textAlign = 'left';
        const lx = sx + dotR + 5;
        const ly = sy + 4;

        // Shadow for readability
        ctx.fillStyle = `rgba(0,0,0,${labelAlpha * 0.7})`;
        ctx.fillText(fc.currency, lx + 1, ly + 1);

        ctx.fillStyle = `rgba(${hexToRgb(fc.color)},${labelAlpha})`;
        ctx.fillText(fc.currency, lx, ly);
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 480;

    const loop = () => {
      if (autoRotate.current && !dragging.current) {
        rotY.current += 0.003;
      }
      draw();
      rafId.current = requestAnimationFrame(loop);
    };
    loop();

    // Mouse events
    const onDown = (e: MouseEvent) => {
      dragging.current = true;
      autoRotate.current = false;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      if (dragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        rotY.current += dx * 0.006;
        rotX.current = Math.max(-1.2, Math.min(1.2, rotX.current - dy * 0.006));
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }

      // Hover detection
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.38;
      let found: number | null = null;
      FINANCIAL_CENTERS.forEach((fc, idx) => {
        const p = latLonToXYZ(fc.lat, fc.lon, rotY.current, rotX.current, R);
        if (p.z <= 0) return;
        const sx = cx + p.x, sy = cy - p.y;
        const dist = Math.hypot(mx - sx, my - sy);
        if (dist < 12) found = idx;
      });
      hoveredIdx.current = found;
      if (found !== null) {
        const fc = FINANCIAL_CENTERS[found];
        const W2 = canvas.width, H2 = canvas.height;
        const cx2 = W2 / 2, cy2 = H2 / 2;
        const R2 = Math.min(W2, H2) * 0.38;
        const p = latLonToXYZ(fc.lat, fc.lon, rotY.current, rotX.current, R2);
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        setTooltip({
          x: rect.left + (cx2 + p.x) * scaleX,
          y: rect.top + (cy2 - p.y) * scaleY - 50,
          label: fc.label,
          currency: fc.currency,
          color: fc.color,
        });
      } else {
        setTooltip(null);
      }
    };
    const onUp = () => {
      dragging.current = false;
      setTimeout(() => { autoRotate.current = true; }, 2500);
    };
    const onLeave = () => {
      dragging.current = false;
      hoveredIdx.current = null;
      setTooltip(null);
      setTimeout(() => { autoRotate.current = true; }, 1500);
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      dragging.current = true;
      autoRotate.current = false;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      rotY.current += dx * 0.006;
      rotX.current = Math.max(-1.2, Math.min(1.2, rotX.current - dy * 0.006));
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { dragging.current = false; setTimeout(() => { autoRotate.current = true; }, 2500); };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(rafId.current);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [draw]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: 'auto',
          cursor: 'grab',
          display: 'block',
          filter: 'drop-shadow(0 0 60px rgba(59,130,246,0.25))',
        }}
        title="Drag to rotate"
      />
      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translateX(-50%)',
          background: 'rgba(10,16,31,0.95)',
          border: `1px solid ${tooltip.color}55`,
          borderRadius: '10px',
          padding: '0.45rem 0.9rem',
          pointerEvents: 'none',
          zIndex: 9999,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${tooltip.color}22`,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: tooltip.color }}>{tooltip.currency}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{tooltip.label}</span>
        </div>
      )}
      {/* Drag hint */}
      <p style={{
        textAlign: 'center', marginTop: '0.75rem',
        fontSize: '0.7rem', color: '#334155',
        letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
      }}>
        ↻ Drag to rotate
      </p>
    </div>
  );
};

// Helper to extract RGB from hex
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─────────────────────────────────────────────────────────
// TICKER DATA
// ─────────────────────────────────────────────────────────
const TICKER_DATA = [
  { symbol: 'AAPL', price: '194.82', change: '+1.24%', up: true },
  { symbol: 'MSFT', price: '418.35', change: '+0.87%', up: true },
  { symbol: 'GOOGL', price: '176.50', change: '-0.34%', up: false },
  { symbol: 'TSLA', price: '251.14', change: '+2.18%', up: true },
  { symbol: 'NVDA', price: '127.25', change: '+3.42%', up: true },
  { symbol: 'META', price: '558.30', change: '-0.95%', up: false },
  { symbol: 'AMZN', price: '198.40', change: '+1.07%', up: true },
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
export default function HeroFuturistic({ onExplore }: HeroFuturisticProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f0f6ff', overflowX: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
        <div style={{ background: 'rgba(10,16,31,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(24px)' }}>
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
