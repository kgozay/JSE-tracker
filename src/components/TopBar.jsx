import React, { useState } from 'react';
import clsx from 'clsx';

const PAGE_TITLES = {
  overview:  'OVERVIEW DASHBOARD',
  macro:     'MACRO TRANSMISSION CHANNELS',
  drilldown: 'SECTOR & STOCK DRILLDOWN',
};

const STATUS_BADGE = {
  live:    { cls: 'bg-bull/10 text-bull border border-bull/30',  label: (t) => `● LIVE · ${t}` },
  cached:  { cls: 'bg-warn/10 text-warn border border-warn/30', label: (t) => `◔ CACHED · ${t}` },
  loading: { cls: 'bg-warn/10 text-warn border border-warn/30 animate-pulse2', label: () => '↻ FETCHING...' },
  mock:    { cls: 'bg-bg-e text-ts border border-bd',            label: () => '○ MOCK DATA' },
  error:   { cls: 'bg-bear/10 text-bear border border-bear/30', label: () => '✕ ERROR' },
};

const REFRESH_OPTIONS = [
  { key: 'off', label: 'OFF' },
  { key: '1m',  label: '1M'  },
  { key: '5m',  label: '5M'  },
  { key: '15m', label: '15M' },
  { key: '30m', label: '30M' },
];

function Divider() { return <div className="w-px h-4 bg-bd mx-0.5" />; }

function BtnGroup({ children }) {
  return <div className="flex bg-bg-c border border-bd rounded overflow-hidden">{children}</div>;
}

function BtnGroupItem({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={clsx('px-2.5 py-1 font-mono text-[10px] transition-colors whitespace-nowrap',
        active ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp')}>
      {label}
    </button>
  );
}

export default function TopBar({
  page, status, error, lastFetch, progress,
  onFetch, timeframe, setTimeframe, returnMode, setReturnMode,
  autoRefresh, onExport,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.mock;
  const ts    = lastFetch?.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) ?? '';
  const now   = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="h-[58px] bg-bg-s border-b border-bd flex items-center justify-between px-5 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-display text-[19px] tracking-[2px] text-tp whitespace-nowrap">{PAGE_TITLES[page]}</h1>
        <div className="font-mono text-[9px] text-ts border-l border-bd pl-3 whitespace-nowrap hidden xl:block">
          {dateStr} · {status === 'loading' ? (progress || 'Fetching…') : 'Iran Conflict Escalation'}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={clsx('font-mono text-[9px] px-2 py-0.5 rounded whitespace-nowrap', badge.cls)}>
          {badge.label(ts)}
        </span>
        {error && (
          <span className="font-mono text-[9px] text-bear max-w-[160px] truncate hidden lg:block" title={error}>{error}</span>
        )}
        <Divider />

        <BtnGroup>
          {['1D','5D','20D'].map(tf => <BtnGroupItem key={tf} label={tf} active={timeframe===tf} onClick={()=>setTimeframe(tf)} />)}
        </BtnGroup>
        <BtnGroup>
          {['ABS','REL'].map(rm => <BtnGroupItem key={rm} label={rm} active={returnMode===rm} onClick={()=>setReturnMode(rm)} />)}
        </BtnGroup>
        <Divider />

        {/* Auto-refresh */}
        {autoRefresh && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8px] text-tm whitespace-nowrap hidden lg:block">AUTO</span>
            <BtnGroup>
              {REFRESH_OPTIONS.map(opt => (
                <BtnGroupItem key={opt.key} label={opt.label}
                  active={autoRefresh.intervalKey === opt.key}
                  onClick={() => autoRefresh.setIntervalKey(opt.key)} />
              ))}
            </BtnGroup>
            {autoRefresh.countdown && (
              <span className="font-mono text-[9px] text-warn w-10 text-right tabular-nums">{autoRefresh.countdown}</span>
            )}
          </div>
        )}

        {/* Fetch button */}
        <button onClick={onFetch} disabled={status==='loading'}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-semibold rounded transition-colors whitespace-nowrap',
            status==='loading' ? 'bg-bg-e text-tm cursor-not-allowed' : 'bg-warn text-bg hover:bg-warn/80 cursor-pointer')}>
          {status==='loading'
            ? <><span className="w-2.5 h-2.5 border-2 border-bg/40 border-t-bg rounded-full animate-spin inline-block" />FETCHING</>
            : <>⚡ FETCH LIVE</>}
        </button>

        {/* Export dropdown */}
        {onExport && (
          <div className="relative">
            <button onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] text-ts border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors">
              ↓ EXPORT
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-bg-s border border-bd rounded shadow-2xl z-50 min-w-[160px]">
                {[
                  { label: '📊 Watchlist CSV',  key: 'watchlist-csv'  },
                  { label: '📈 Macro CSV',       key: 'macro-csv'      },
                  { label: '🗂  Snapshot JSON',   key: 'snapshot-json'  },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => { onExport(opt.key); setExportOpen(false); }}
                    className="w-full text-left px-3.5 py-2.5 font-mono text-[10px] text-ts hover:text-tp hover:bg-bg-h transition-colors whitespace-nowrap">
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
