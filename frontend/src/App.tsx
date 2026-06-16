import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, BACKEND_URL } from './config';
import HeroFuturistic from './components/ui/hero-futuristic';
import AuthPage from './components/ui/auth-page';
import { FallingCurrencyPattern } from './components/ui/falling-currency-pattern';
import {
  Search,
  Mail,
  LogOut,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  User as UserIcon,
  Loader2,
  Globe,
  BarChart3,
  RefreshCw,
  Star,
  ChevronRight,
  X,
} from 'lucide-react';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Prediction {
  predictedClose: number;
  direction: 'UP' | 'DOWN';
  percentChange: number;
}

interface Stock {
  symbol: string;
  ticker: string;
  price: number | null;
  previousClose: number | null;
  prediction?: Prediction | null;
}

function isIndianMarket(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return upper.endsWith('.NS') || upper.endsWith('.BO');
}

function marketTicker(stock: Stock): string {
  return stock.ticker || stock.symbol;
}

function watchlistKey(sym: string): string {
  return normalizeSymbol(sym).replace(/\.(NS|BO)$/i, '');
}

function normalizeSymbol(sym: string) {
  return String(sym || '').trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '');
}

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [topStocks, setTopStocks] = useState<Stock[]>([]);
  const [searchResults, setSearchResults] = useState<Stock[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());

  const [stocksLoading, setStocksLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [stocksError, setStocksError] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'watchlist'>('market');

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nav scroll effect
  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth on load
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) setView('dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) setView('dashboard');
      else setView('landing');
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeStocks = useCallback((data: unknown[]): Stock[] => {
    if (!Array.isArray(data)) return [];
    return data.map((s) => {
      const row = s as Record<string, unknown>;
      const prediction = row.prediction as Record<string, unknown> | null | undefined;
      return {
        symbol: normalizeSymbol(String(row.symbol ?? '')),
        ticker: String(row.ticker || ''),
        price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
        previousClose: row.previousClose !== null && row.previousClose !== undefined ? Number(row.previousClose) : null,
        prediction: prediction ? {
          predictedClose: Number(prediction.predictedClose),
          direction: prediction.direction as Prediction['direction'],
          percentChange: Number(prediction.percentChange),
        } : null,
      };
    }).filter((stock) => stock.symbol);
  }, []);

  const fetchTopStocks = useCallback(async () => {
    setStocksLoading(true);
    setStocksError('');
    try {
      const response = await fetch(`${BACKEND_URL}/top-stocks`);
      if (!response.ok) throw new Error('Failed to fetch top stocks.');
      const data = await response.json();
      setTopStocks(normalizeStocks(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading top stocks.';
      setStocksError(message);
    } finally {
      setStocksLoading(false);
    }
  }, [normalizeStocks]);

  // Fetch on dashboard
  useEffect(() => {
    if (view !== 'dashboard' || !user) return;

    let active = true;

    void (async () => {
      setWatchlistLoading(true);
      try {
        const { data, error } = await supabase
          .from('watchlists')
          .select('stock_symbol')
          .eq('user_id', user.id);
        if (!active) return;
        if (error) throw error;
        const symbols = new Set((data || []).map((item) => watchlistKey(item.stock_symbol)));
        setWatchlistSymbols(symbols);
      } catch (err) {
        console.error('Error fetching watchlist:', err);
      } finally {
        if (active) setWatchlistLoading(false);
      }
    })();

    void (async () => {
      setStocksLoading(true);
      setStocksError('');
      try {
        const response = await fetch(`${BACKEND_URL}/top-stocks`);
        if (!active) return;
        if (!response.ok) throw new Error('Failed to fetch top stocks.');
        const data = await response.json();
        setTopStocks(normalizeStocks(data));
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Error loading top stocks.';
        setStocksError(message);
      } finally {
        if (active) setStocksLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [view, user, normalizeStocks]);

  const watchlistStocks = useMemo(() => {
    const allKnownStocks = [...topStocks, ...(searchResults || [])];
    const details: Stock[] = [];

    watchlistSymbols.forEach((symbol) => {
      const match = allKnownStocks.find(
        (s) => watchlistKey(s.ticker || s.symbol) === watchlistKey(symbol)
      );
      if (match) details.push(match);
      else details.push({ symbol, ticker: symbol, price: null, previousClose: null });
    });

    return details.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [watchlistSymbols, topStocks, searchResults]);

  // Auth
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setView('dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthSuccess('Account created! You can now log in.');
        setAuthMode('login');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('landing');
    setWatchlistSymbols(new Set());
    setSearchResults(null);
    setSearchQuery('');
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const query = val.trim();
      if (query.length >= 2) searchStocks(query);
      else setSearchResults(null);
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const searchStocks = async (query: string) => {
    setStocksLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/search-stock?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search request failed.');
      const data = await response.json();
      setSearchResults(normalizeStocks(data));
    } catch (err) {
      console.error('Error searching stocks:', err);
    } finally {
      setStocksLoading(false);
    }
  };

  const addStockToWatchlist = async (stockSymbol: string) => {
    if (!user) return;
    const symbol = watchlistKey(stockSymbol);
    if (watchlistSymbols.has(symbol)) return;
    try {
      const { error } = await supabase
        .from('watchlists')
        .insert([{ user_id: user.id, stock_symbol: symbol }]);
      if (error) throw error;
      setWatchlistSymbols((prev) => {
        const next = new Set(prev);
        next.add(symbol);
        return next;
      });
    } catch (err) {
      console.error('Error adding stock:', err);
    }
  };

  const removeStockFromWatchlist = async (stockSymbol: string) => {
    if (!user) return;
    const symbol = watchlistKey(stockSymbol);
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('stock_symbol', symbol);
      if (error) throw error;
      setWatchlistSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    } catch (err) {
      console.error('Error removing stock:', err);
    }
  };

  const formatPrice = (price: number | null, ticker: string) => {
    if (price === null) return '—';
    return isIndianMarket(ticker) ? `₹${price.toFixed(2)}` : `$${price.toFixed(2)}`;
  };

  const getChange = (stock: Stock) => {
    if (stock.price === null || stock.previousClose === null || stock.previousClose === 0) return null;
    const change = stock.price - stock.previousClose;
    const pct = (change / stock.previousClose) * 100;
    return { change, pct, isPositive: change >= 0 };
  };

  // Landing page
  if (view === 'landing') {
    return <HeroFuturistic onExplore={() => user ? setView('dashboard') : setView('auth')} />;
  }

  // Auth page — full-page Polar-style split layout
  if (view === 'auth') {
    return (
      <AuthPage
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authError={authError}
        authSuccess={authSuccess}
        authLoading={authLoading}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuth}
        onToggleMode={() => {
          setAuthMode(authMode === 'login' ? 'signup' : 'login');
          setAuthError('');
          setAuthSuccess('');
        }}
        onBack={() => setView('landing')}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f0f6ff', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Animated background */}
      <div className="animated-bg" />
      <FallingCurrencyPattern />
      <div className="grid-overlay" />

      {/* ===== NAVBAR ===== */}
      <header className={`navbar ${navScrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setView(user ? 'dashboard' : 'landing')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            id="nav-logo"
          >
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 900, color: '#fff',
              boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
            }}>
              ST
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#f0f6ff', letterSpacing: '-0.01em' }}>
              Stock<span style={{ color: '#60a5fa' }}>Track</span>
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '200px',
                  overflow: 'hidden',
                }}>
                  <UserIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  id="nav-logout"
                  style={{ padding: '0.5rem 0.9rem' }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                  <span style={{ display: 'none' }}>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setView('auth')}
                className="btn-primary"
                id="nav-signin"
              >
                Sign In <ChevronRight style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '5rem 1.5rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* ===== DASHBOARD VIEW ===== */}
        {view === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Dashboard Header */}
            <div className="dashboard-enter" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div className="section-pill" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                    <BarChart3 style={{ width: '12px', height: '12px' }} />
                    Dashboard
                  </div>
                </div>
                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#f0f6ff', letterSpacing: '-0.02em' }}>
                  Market Dashboard
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.3rem' }}>
                  Real-time quotes · ML next-day price forecast
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={fetchTopStocks}
                  disabled={stocksLoading}
                  className="btn-secondary"
                  id="refresh-stocks"
                  style={{ padding: '0.6rem' }}
                  title="Refresh"
                >
                  <RefreshCw style={{ width: '15px', height: '15px', animation: stocksLoading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="dashboard-enter-delay-1 search-wrapper" style={{ maxWidth: '520px' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="stock-search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search stocks... (AAPL, RELIANCE.NS, TSLA)"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <X style={{ width: '14px', height: '14px' }} />
                </button>
              )}
            </div>

            {/* Email Newsletter Banner */}
            <div className="email-banner dashboard-enter-delay-2">
              <div style={{
                width: '40px', height: '40px', flexShrink: 0,
                background: 'rgba(14,165,233,0.12)',
                border: '1px solid rgba(14,165,233,0.2)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#38bdf8',
              }}>
                <Mail style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.925rem', color: '#f0f6ff', marginBottom: '0.25rem' }}>
                  Daily Forecast Digest
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  AI-powered stock predictions sent to <strong style={{ color: '#60a5fa' }}>{user?.email}</strong> every morning at 9:00 AM. Add stocks to your watchlist to get started.
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="dashboard-enter-delay-2" style={{
              display: 'flex',
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '4px',
              width: 'fit-content',
              gap: '2px',
            }}>
              {([
                { id: 'market', label: 'Market', icon: <Globe style={{ width: '14px', height: '14px' }} /> },
                { id: 'watchlist', label: `Watchlist (${watchlistSymbols.size})`, icon: <Star style={{ width: '14px', height: '14px' }} /> },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: activeTab === tab.id ? '#60a5fa' : 'var(--text-muted)',
                    boxShadow: activeTab === tab.id ? '0 2px 10px rgba(59,130,246,0.15)' : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== WATCHLIST TAB ===== */}
            {activeTab === 'watchlist' && (
              <div className="dashboard-enter">
                {watchlistLoading && watchlistStocks.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '4rem', color: 'var(--text-muted)' }}>
                    <Loader2 style={{ width: '20px', height: '20px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                    Syncing watchlist…
                  </div>
                ) : watchlistStocks.length === 0 ? (
                  <div className="empty-state">
                    <div style={{
                      width: '56px', height: '56px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 1rem', color: 'var(--text-muted)',
                    }}>
                      <TrendingUp style={{ width: '24px', height: '24px' }} />
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Your watchlist is empty</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Switch to the Market tab and click "+ Watch" to add stocks
                    </p>
                    <button
                      onClick={() => setActiveTab('market')}
                      className="btn-primary"
                      style={{ marginTop: '1.25rem' }}
                      id="go-to-market"
                    >
                      Browse Market <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                    {watchlistStocks.map((stock) => (
                      <StockCard
                        key={stock.symbol}
                        stock={stock}
                        variant="watchlist"
                        onAction={() => removeStockFromWatchlist(stock.symbol)}
                        actionLabel="Remove"
                        formatPrice={formatPrice}
                        getChange={getChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== MARKET TAB ===== */}
            {activeTab === 'market' && (
              <div className="dashboard-enter">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#f0f6ff' }}>
                      {searchResults ? `Search Results (${searchResults.length})` : 'Top Stocks'}
                    </h2>
                    {stocksLoading && (
                      <Loader2 style={{ width: '16px', height: '16px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                    )}
                  </div>
                  {searchResults && (
                    <button onClick={clearSearch} className="btn-secondary" id="clear-search" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
                      <X style={{ width: '13px', height: '13px' }} /> Clear Search
                    </button>
                  )}
                </div>

                {stocksError ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '16px', color: '#fb7185' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Failed to load stocks</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{stocksError}</p>
                    <button onClick={fetchTopStocks} className="btn-primary" id="retry-fetch" style={{ fontSize: '0.8rem' }}>
                      <RefreshCw style={{ width: '13px', height: '13px' }} /> Retry
                    </button>
                  </div>
                ) : (searchResults || topStocks).length === 0 && !stocksLoading ? (
                  <div className="empty-state">
                    <Globe style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      {searchResults ? 'No stocks found' : 'Loading market data…'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {searchResults ? 'Try a different ticker symbol' : 'Check that the backend is running'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                    {(searchResults || topStocks).map((stock) => {
                      const isAdded = watchlistSymbols.has(watchlistKey(stock.ticker || stock.symbol));
                      return (
                        <StockCard
                          key={stock.symbol}
                          stock={stock}
                          variant="market"
                          isWatched={isAdded}
                          onAction={() => isAdded ? removeStockFromWatchlist(stock.symbol) : addStockToWatchlist(stock.ticker || stock.symbol)}
                          actionLabel={isAdded ? 'Watching' : '+ Watch'}
                          formatPrice={formatPrice}
                          getChange={getChange}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
      }}>
        © 2026 StockTrack · AI forecasts are for informational purposes only, not financial advice.
      </footer>
    </div>
  );
}

// ===== STOCK CARD COMPONENT =====
interface StockCardProps {
  stock: Stock;
  variant: 'market' | 'watchlist';
  isWatched?: boolean;
  onAction: () => void;
  actionLabel: string;
  formatPrice: (price: number | null, ticker: string) => string;
  getChange: (stock: Stock) => { change: number; pct: number; isPositive: boolean } | null;
}

function StockCard({ stock, variant, isWatched, onAction, actionLabel, formatPrice, getChange }: StockCardProps) {
  const change = getChange(stock);
  const ticker = marketTicker(stock);
  const isINR = isIndianMarket(ticker);
  const exchange = isINR ? 'NSE' : 'NASDAQ';
  const hasPrediction = !!stock.prediction;
  const predIsUp = stock.prediction?.direction === 'UP';

  return (
    <div
      className={`stock-card ${variant === 'watchlist' ? 'stock-card-watchlist' : ''}`}
      style={{ minHeight: '160px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px',
          }}>
            {exchange}
          </span>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#f0f6ff', marginTop: '0.35rem', letterSpacing: '-0.01em' }}>
            {stock.symbol}
          </h3>
        </div>

        {/* Action button */}
        {variant === 'market' ? (
          <button
            onClick={onAction}
            id={`watchlist-toggle-${stock.symbol}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '0.3rem 0.65rem',
              borderRadius: '8px',
              border: isWatched ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
              background: isWatched ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              color: isWatched ? '#34d399' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <Star style={{ width: '10px', height: '10px', fill: isWatched ? 'currentColor' : 'none' }} />
            {actionLabel}
          </button>
        ) : (
          <button
            onClick={onAction}
            className="btn-danger"
            id={`remove-${stock.symbol}`}
            title="Remove from watchlist"
          >
            <Trash2 style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>

      {/* Price & change */}
      <div>
        <div className="price-display">
          {formatPrice(stock.price, ticker)}
        </div>
        {change ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '0.78rem', fontWeight: 700, marginTop: '0.2rem',
            color: change.isPositive ? '#34d399' : '#fb7185',
          }}>
            {change.isPositive ? <TrendingUp style={{ width: '12px', height: '12px' }} /> : <TrendingDown style={{ width: '12px', height: '12px' }} />}
            {change.isPositive ? '+' : ''}{change.change.toFixed(2)} ({change.isPositive ? '+' : ''}{change.pct.toFixed(2)}%)
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Change unavailable</span>
        )}
      </div>

      {/* AI Prediction */}
      {hasPrediction && (
        <div className={`prediction-badge ${predIsUp ? 'up' : 'down'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles style={{ width: '12px', height: '12px' }} />
            <span>AI: {formatPrice(stock.prediction!.predictedClose, ticker)}</span>
          </div>
          <span style={{ fontWeight: 800 }}>
            {predIsUp ? '▲' : '▼'} {stock.prediction!.percentChange.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
