import { useState, useCallback, useRef } from 'react';
import { JSE_STOCKS, MACRO_SYMBOLS, ALL_SYMBOLS } from '../data/stocks.js';

const CACHE_KEY = 'jse_cw_v3';
const CACHE_TTL = 5 * 60 * 1000;

function getEnv() {
  const h = window.location.hostname;
  if (h.includes('stackblitz') || h.includes('webcontainer')) return 'stackblitz';
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  return 'netlify';
}

// Empty baseline — no fake numbers
function emptyAssets() {
  return Object.fromEntries(
    Object.entries(MACRO_SYMBOLS).map(([key, meta]) => [
      key,
      { ...meta, price: null, changePct: null, change: null, prevClose: null, isLive: false },
    ])
  );
}

function emptyStocks() {
  return JSE_STOCKS.map(s => ({
    ...s,
    price: null, changePct: null, change: null, prevClose: null, isLive: false,
  }));
}

function applyQuotes(quotes, baseAssets, baseStocks) {
  const ASSET_MAP = {
    'BZ=F': 'brent', 'GC=F': 'gold', 'PL=F': 'platinum',
    'PA=F': 'palladium', 'USDZAR=X': 'usdZar', 'MTF=F': 'coal', '^TNX': 'sa10y',
  };
  const assets = { ...baseAssets };
  for (const [sym, key] of Object.entries(ASSET_MAP)) {
    const q = quotes[sym];
    if (q?.price != null) {
      assets[key] = { ...assets[key], price: q.price, changePct: q.changePct, change: q.change, prevClose: q.prevClose, name: q.name || assets[key].name, isLive: true };
    }
  }
  const stocks = baseStocks.map(s => {
    const q = quotes[s.ticker];
    return q?.price != null
      ? { ...s, price: q.price, changePct: q.changePct, change: q.change, prevClose: q.prevClose, isLive: true }
      : s;
  });
  return { assets, stocks };
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL) return null;
    return c;
  } catch { return null; }
}

function saveCache(quotes) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), quotes })); }
  catch { /* storage full */ }
}

export function useMarketData() {
  const [assets,    setAssets]    = useState(emptyAssets);
  const [stocks,    setStocks]    = useState(emptyStocks);
  const [status,    setStatus]    = useState('empty');   // empty | loading | live | cached | error
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [progress,  setProgress]  = useState('');
  const [env,       setEnv]       = useState(null);
  const abortRef = useRef(null);

  const initFromCache = useCallback(() => {
    const e = getEnv();
    setEnv(e);
    const cached = loadCache();
    if (cached?.quotes) {
      const { assets: a, stocks: s } = applyQuotes(cached.quotes, emptyAssets(), emptyStocks());
      setAssets(a); setStocks(s);
      setStatus('cached');
      setLastFetch(new Date(cached.ts));
    }
  }, []);

  const fetchLive = useCallback(async () => {
    const environment = env ?? getEnv();
    if (environment === 'stackblitz') {
      setError('Live data requires Netlify deployment. Stackblitz cannot run serverless functions.');
      setStatus('error');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('loading');
    setError(null);
    setProgress('Connecting to Yahoo Finance…');

    try {
      setProgress(`Fetching ${ALL_SYMBOLS.split ? ALL_SYMBOLS.length : ALL_SYMBOLS.length} symbols…`);
      const symbolStr = ALL_SYMBOLS.join(',');
      const res = await fetch(
        `/.netlify/functions/quotes?symbols=${encodeURIComponent(symbolStr)}`,
        { signal: ctrl.signal }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      setProgress('Processing…');
      const data = await res.json();
      if (!data.quotes) throw new Error('Unexpected response from server');

      const { assets: a, stocks: s } = applyQuotes(data.quotes, emptyAssets(), emptyStocks());
      setAssets(a); setStocks(s);
      setStatus('live');
      setLastFetch(new Date());
      setProgress('');
      saveCache(data.quotes);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
      setStatus('error');
      setProgress('');
    }
  }, [env]);

  return { assets, stocks, status, error, lastFetch, progress, fetchLive, initFromCache, env };
}
