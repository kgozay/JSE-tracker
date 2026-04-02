import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';
import { exportWatchlistCSV } from '../utils/export.js';

const FILTERS = ['ALL','Gold Miners','Energy','Banks','Retailers','PGMs','Industrials','Mining','Telecoms'];

const SIG = {
  BULLISH:    'bg-bull/10 text-bull border-bull/30',
  'MILD BULL':'bg-bull/6 text-bull/70 border-bull/20',
  NEUTRAL:    'bg-bg-e text-ts border-bd',
  BEARISH:    'bg-bear/10 text-bear border-bear/30',
};

function fmt(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  if (p >= 100)  return p.toFixed(1);
  return p.toFixed(2);
}

function SortIcon({ active, dir }) {
  return <span className={clsx('ml-1 text-[8px]', active ? 'text-warn' : 'text-tm')}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>;
}

export default function Watchlist({ stocks, timeframe }) {
  const [filter,  setFilter]  = useState('ALL');
  const [sort,    setSort]    = useState({ key: 'sector', dir: 'asc' });
  const [csvDone, setCsvDone] = useState(false);

  const hasAnyData = stocks.some(s => s.isLive);
  const liveCount  = stocks.filter(s => s.isLive).length;

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? stocks : stocks.filter(s => s.sector === filter);
    return [...base].sort((a, b) => {
      let av = a[sort.key] ?? '', bv = b[sort.key] ?? '';
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv + '').toLowerCase(); }
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [stocks, filter, sort]);

  function toggleSort(key) {
    setSort(p => p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  }

  function handleCsv() {
    exportWatchlistCSV(filtered, timeframe);
    setCsvDone(true);
    setTimeout(() => setCsvDone(false), 2000);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">Key Shares Watchlist</span>
          <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">{filtered.length} NAMES</span>
          {liveCount > 0 && (
            <span className="font-mono text-[8px] text-bull border border-bull/30 bg-bull/8 px-1.5 py-0.5 rounded-sm">{liveCount} LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-bg-c border border-bd rounded overflow-hidden">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('px-2 py-0.5 font-mono text-[9px] transition-colors cursor-pointer',
                  filter === f ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp')}>
                {f === 'ALL' ? 'ALL' : f.length > 7 ? f.slice(0, 4).toUpperCase() : f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={handleCsv}
            className="px-2.5 py-1 font-mono text-[9px] text-ts border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer">
            {csvDone ? '✓ SAVED' : '↓ CSV'}
          </button>
        </div>
      </div>

      {!hasAnyData && (
        <div className="py-8 text-center font-mono text-[10px] text-tm">
          Fetch live data to populate the watchlist with real prices
        </div>
      )}

      {(hasAnyData || true) && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  { key:'name',      label:'NAME',       align:'left'  },
                  { key:'sector',    label:'SECTOR',     align:'left'  },
                  { key:'price',     label:'PRICE (ZAR)',align:'right' },
                  { key:'changePct', label:'1D CHG',     align:'right' },
                  { key:'mktcap',    label:'MKT CAP',    align:'right' },
                  { key:'pe',        label:'P/E',        align:'right' },
                  { key:'signal',    label:'SIGNAL',     align:'right' },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)}
                    className={clsx('font-mono text-[8px] tracking-[1.5px] text-tm py-1.5 px-1.5 border-b border-bd-x cursor-pointer select-none hover:text-ts whitespace-nowrap',
                      col.align === 'right' ? 'text-right' : 'text-left')}>
                    {col.label}<SortIcon active={sort.key === col.key} dir={sort.dir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const chg   = s.changePct ?? null;
                const isUp  = (chg ?? 0) >= 0;
                const sigCls = SIG[s.signal] ?? SIG.NEUTRAL;
                return (
                  <tr key={s.ticker} className="hover:bg-bg-h transition-colors">
                    <td className="py-1.5 px-1.5 border-b border-bd-x">
                      <div className="font-sans text-[11px] font-semibold text-tp leading-tight">{s.name}</div>
                      <div className="flex items-center gap-1.5 font-mono text-[8px] text-ts">
                        {s.display}
                        {s.isLive && <span className="text-bull text-[7px]">● LIVE</span>}
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 border-b border-bd-x">
                      <span className="font-mono text-[7px] bg-bg-e text-ts px-1.5 py-0.5 rounded-sm">{s.sector}</span>
                    </td>
                    <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold text-tp">{fmt(s.price)}</td>
                    <td className={clsx('py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] font-semibold',
                      chg == null ? 'text-tm' : isUp ? 'text-bull' : 'text-bear')}>
                      {chg == null ? '—' : `${isUp ? '+' : ''}${chg.toFixed(2)}%`}
                    </td>
                    <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">{s.mktcap}</td>
                    <td className="py-1.5 px-1.5 border-b border-bd-x text-right font-mono text-[10px] text-ts">{s.pe}x</td>
                    <td className="py-1.5 px-1.5 border-b border-bd-x text-right">
                      <span className={clsx('font-mono text-[7px] px-1.5 py-0.5 rounded-sm border', sigCls)}>
                        {s.signal ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
