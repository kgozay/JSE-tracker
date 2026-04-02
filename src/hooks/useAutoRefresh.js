import { useState, useEffect, useRef, useCallback } from 'react';

const INTERVALS = {
  '1m':  60_000,
  '5m':  300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  off:   null,
};

export function useAutoRefresh(onRefresh) {
  const [interval, setInterval_] = useState('off');
  const [nextIn,   setNextIn]    = useState(null);   // seconds until next refresh
  const timerRef   = useRef(null);
  const countRef   = useRef(null);
  const startedRef = useRef(null);

  const clearAll = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(countRef.current);
    timerRef.current  = null;
    countRef.current  = null;
    startedRef.current = null;
    setNextIn(null);
  }, []);

  const start = useCallback((intervalKey) => {
    clearAll();
    const ms = INTERVALS[intervalKey];
    if (!ms) return;

    startedRef.current = Date.now();

    // Main refresh timer
    timerRef.current = setInterval(() => {
      onRefresh();
      startedRef.current = Date.now();
    }, ms);

    // Countdown ticker (every second)
    countRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedRef.current ?? Date.now());
      const remaining = Math.max(0, Math.ceil((ms - elapsed) / 1000));
      setNextIn(remaining);
    }, 1000);

    setNextIn(Math.ceil(ms / 1000));
  }, [onRefresh, clearAll]);

  // React to interval changes
  useEffect(() => {
    if (interval === 'off') {
      clearAll();
    } else {
      start(interval);
    }
    return clearAll;
  }, [interval]);

  const setIntervalKey = useCallback((key) => {
    setInterval_(key);
  }, []);

  function fmtCountdown(secs) {
    if (!secs) return '';
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  return {
    intervalKey: interval,
    setIntervalKey,
    nextIn,
    countdown: fmtCountdown(nextIn),
    isActive: interval !== 'off',
  };
}

export { INTERVALS };
