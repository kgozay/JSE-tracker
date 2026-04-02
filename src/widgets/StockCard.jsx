import React, { useMemo } from 'react';
import clsx from 'clsx';

const SIG = {
  BULLISH:    'bg-bull/10 text-bull border-bull/30',
  'MILD BULL':'bg-bull/6 text-bull/60 border-bull/20',
  NEUTRAL:    'bg-bg-e text-ts border-bd',
  BEARISH:    'bg-bear/10 text-bear border-bear/30',
};

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function Sparkline({ ticker, chg }) {
  const { line, fill, W, H } = useMemo(() => {
    const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng  = seededRng(seed);
    const PTS = 24, W = 200, H = 34;
    const data = [];
    let v = 100;
    for (let i = 0; i < PTS; i++) { v += (chg / PTS) * 0.8 + (rng() - 0.5) * 1.8; data.push(v); }
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    const pts = data.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${((i / (PTS - 1)) * W).toFixed(1)},${(H - ((d - min) / range) * H).toFixed(1)}`
    ).join(' ');
    return { line: pts, fill: `${pts} L ${W},${H} L 0,${H} Z`, W, H };
  }, [ticker, chg]);

  const col = chg >= 0 ? '5,208,154' : '239,68,68';
  const id  = `sg_${ticker.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full block mt-2" style={{ height: 30 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`rgb(${col})`} stopOpacity="0.25" />
          <stop offset="100%" stopColor={`rgb(${col})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} stroke={`rgb(${col})`} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function fmt(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
  if (p >= 100)  return p.toFixed(1);
  return p.toFixed(2);
}

export default function StockCard({ stock }) {
  const chg    = stock.changePct ?? null;
  const isUp   = (chg ?? 0) >= 0;
  const hasChg = chg != null;
  const sigCls = SIG[stock.signal] ?? SIG.NEUTRAL;

  return (
    <div className="bg-bg-c border border-bd rounded p-3 transition-all hover:border-warn/50 hover:-translate-y-px">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <div className="font-sans text-[12px] font-semibold text-tp leading-tight">{stock.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[8px] text-ts">{stock.display}</span>
            {stock.isLive && <span className="font-mono text-[7px] text-bull">● LIVE</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="font-display text-[21px] leading-none text-tp">{fmt(stock.price)}</div>
          {hasChg && (
            <div className={clsx('font-mono text-[10px] font-semibold mt-0.5', isUp ? 'text-bull' : 'text-bear')}>
              {isUp ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {hasChg && <Sparkline ticker={stock.ticker} chg={chg} />}
      {!hasChg && <div className="h-8 flex items-center justify-center font-mono text-[8px] text-tm mt-2">Fetch live data</div>}

      <div className="flex border-t border-bd-x mt-2 pt-2">
        {[
          { label: 'MKT CAP', value: stock.mktcap },
          { label: 'P/E',     value: `${stock.pe}x` },
          { label: 'SECTOR',  value: stock.sector?.slice(0, 6) ?? '—' },
        ].map(m => (
          <div key={m.label} className="flex-1 text-center">
            <div className="font-mono text-[7px] tracking-[1px] text-tm">{m.label}</div>
            <div className="font-mono text-[10px] text-ts mt-0.5">{m.value}</div>
          </div>
        ))}
        <div className="flex-1 text-center">
          <div className="font-mono text-[7px] tracking-[1px] text-tm">SIG</div>
          <div className="mt-0.5">
            <span className={clsx('font-mono text-[7px] px-1 py-0.5 rounded-sm border', sigCls)}>
              {stock.signal ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
