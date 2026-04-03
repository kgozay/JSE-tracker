import { useState, useCallback, useRef, useEffect } from 'react';
import { JSE_STOCKS, MACRO_SYMBOLS, ALL_YAHOO_SYMBOLS, R2035_META } from '../data/stocks.js';

const CACHE_KEY     = 'jse_cw_v4_cache';
const CACHE_TTL     = 5 * 60 * 1000;   // 5 min
const STALE_TTL     = 30 * 60 * 1000;  // show stale data up to 30 min
const FOCUS_REFETCH = 5 * 60 * 1000;   // refetch if tab was away 5+ min

function getEnv() {
  const h = window.location.hostname;
  if (h.includes('stackblitz') || h.includes('webcontainer')) return 'stackblitz';
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  return 'netlify';
}

function emptyAssets() {
  return {
    ...Object.fromEntries(
      Object.entries(MACRO_SYMBOLS).map(([key, meta]) => [
        key,
        { ...meta, price: null, changePct: null, change: null, prevClose: null, isLive: false },
      ])
    ),
    // R2035 bond — separate SARB source
    r2035: { ...R2035_META, price: null, changePct: null, change: null, prevClose: null, isLive: false, source: null },
  };
}

function emptyStocks() {
  return JSE_STOCKS.map(s => ({
    ...s, price: null, changePct: null, change: null, prevClose: null, isLive: false,
  }));
}

function applyQuotes(quotes, baseAssets, baseStocks) {
  const ASSET_MAP = {
    'BZ=F':'brent', 'GC=F':'gold', 'PL=F':'platinum',
    'PA=F':'palladium', 'USDZAR=X':'usdZar', 'MTF=F':'coal',
  };
  const assets = { ...baseAssets };
  for (const [sym, key] of Object.entries(ASSET_MAP)) {
    const q = quotes[sym];
    if (q?.price != null) {
      assets[key] = { ...assets[key], price:q.price, changePct:q.changePct, change:q.change, prevClose:q.prevClose, name:q.name||assets[key].name, isLive:true };
    }
  }
  const stocks = baseStocks.map(s => {
    const q = quotes[s.ticker];
    return q?.price != null
      ? { ...s, price:q.price, changePct:q.changePct, change:q.change, prevClose:q.prevClose, isLive:true }
      : s;
  });
  return { assets, stocks };
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > STALE_TTL) return null;  // discard after 30min
    return c;
  } catch { return null; }
}

function saveCache(quotes, bond) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), quotes, bond })); }
  catch { /* storage full */ }
}

export function useMarketData() {
  const [assets,    setAssets]    = useState(emptyAssets);
  const [stocks,    setStocks]    = useState(emptyStocks);
  const [status,    setStatus]    = useState('empty');
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [progress,  setProgress]  = useState('');
  const [env,       setEnv]       = useState(null);
  const abortRef    = useRef(null);
  const lastFetchTs = useRef(null);

  // Stale-while-revalidate: show cached data instantly on load
  const initFromCache = useCallback(() => {
    const e = getEnv();
    setEnv(e);
    const cached = loadCache();
    if (!cached?.quotes) return false;

    const isStale  = Date.now() - cached.ts > CACHE_TTL;
    const { assets: a, stocks: s } = applyQuotes(cached.quotes, emptyAssets(), emptyStocks());

    // Apply R2035 bond data if cached
    if (cached.bond?.price != null) {
      a.r2035 = { ...a.r2035, ...cached.bond, isLive: true };
    }

    setAssets(a);
    setStocks(s);
    setStatus(isStale ? 'cached' : 'live');
    setLastFetch(new Date(cached.ts));
    lastFetchTs.current = cached.ts;
    return isStale; // true = should background-refresh
  }, []);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchLive = useCallback(async (silent = false) => {
    const environment = env ?? getEnv();
    if (environment === 'stackblitz') {
      setError('Live data requires Netlify deployment.');
      setStatus('error');
      return { success: false };
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!silent) { setStatus('loading'); setError(null); }
    setProgress('Connecting to Yahoo Finance & SARB…');

    try {
      // ── Fetch Yahoo Finance (stocks + commodities) and SARB (R2035) in parallel
      const [yahooRes, sarbRes] = await Promise.allSettled([
        fetch(
          `/.netlify/functions/quotes?symbols=${encodeURIComponent(ALL_YAHOO_SYMBOLS.join(','))}`,
          { signal: ctrl.signal }
        ).then(r => r.ok ? r.json() : Promise.reject(new Error(`Yahoo HTTP ${r.status}`))),

        fetch(`/.netlify/functions/sarb`, { signal: ctrl.signal })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`SARB HTTP ${r.status}`))),
      ]);

      setProgress('Processing…');

      let quotes = {};
      if (yahooRes.status === 'fulfilled' && yahooRes.value?.quotes) {
        quotes = yahooRes.value.quotes;
      } else {
        console.warn('[useMarketData] Yahoo Finance failed:', yahooRes.reason?.message);
      }

      let bond = null;
      if (sarbRes.status === 'fulfilled' && sarbRes.value?.bond) {
        bond = sarbRes.value.bond;
        console.log(`[useMarketData] R2035: ${bond.price}% (${bond.source})`);
      } else {
        console.warn('[useMarketData] SARB/R2035 failed:', sarbRes.reason?.message);
      }

      if (!Object.keys(quotes).length && !bond) {
        throw new Error('All data sources failed. Check your Netlify function logs.');
      }

      const { assets: a, stocks: s } = applyQuotes(quotes, emptyAssets(), emptyStocks());

      // Apply R2035 bond data
      if (bond?.price != null) {
        a.r2035 = {
          ...a.r2035,
          price:     bond.price,
          changePct: bond.changePct,
          change:    bond.change,
          prevClose: bond.prevClose,
          isLive:    true,
          source:    bond.source,
          isProxy:   bond.isProxy ?? false,
          date:      bond.date,
        };
      }

      setAssets(a);
      setStocks(s);
      setStatus('live');
      setLastFetch(new Date());
      lastFetchTs.current = Date.now();
      setProgress('');
      setError(null);
      saveCache(quotes, bond);

      return { success: true, assets: a, stocks: s };

    } catch (e) {
      if (e.name === 'AbortError') return { success: false };
      console.error('[useMarketData]', e);
      if (!silent) { setError(e.message); setStatus('error'); }
      setProgress('');
      return { success: false, error: e.message };
    }
  }, [env]);

  // ── Focus refetch: if tab was hidden 5+ min, silently refresh on return ──
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      if (!lastFetchTs.current) return;
      const away = Date.now() - lastFetchTs.current;
      if (away > FOCUS_REFETCH) {
        console.log(`[useMarketData] Tab back after ${Math.round(away/60000)}min — background refresh`);
        fetchLive(true); // silent = don't show loading overlay
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchLive]);

  return { assets, stocks, status, error, lastFetch, progress, fetchLive, initFromCache, env };
}
