import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SECTOR_ORDER } from './data/stocks.js';
import { computeCIS }    from './utils/scoring.js';
import { computeAlerts } from './utils/alerts.js';
import { exportWatchlistCSV, exportMacroCSV, exportSnapshotJSON } from './utils/export.js';
import { useMarketData }  from './hooks/useMarketData.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import Sidebar           from './components/Sidebar.jsx';
import TopBar            from './components/TopBar.jsx';
import LoadingOverlay    from './components/LoadingOverlay.jsx';
import Overview          from './pages/Overview.jsx';
import MacroTransmission from './pages/MacroTransmission.jsx';
import SectorDrilldown   from './pages/SectorDrilldown.jsx';

function deriveSectors(stocks) {
  const sectors  = {};
  const top40Chg = stocks.length > 0 && stocks.some(s => s.isLive)
    ? stocks.filter(s => s.changePct != null).reduce((a, s) => a + s.changePct, 0) / stocks.filter(s => s.changePct != null).length
    : null;

  for (const sector of SECTOR_ORDER) {
    const ss  = stocks.filter(s => s.sector === sector && s.changePct != null);
    if (!ss.length) continue;
    const avg = ss.reduce((a, s) => a + s.changePct, 0) / ss.length;
    sectors[sector] = { name: sector, chg: +avg.toFixed(2), rel: top40Chg != null ? +(avg - top40Chg).toFixed(2) : null };
  }
  sectors.top40 = { name: 'JSE Top 40', chg: top40Chg != null ? +top40Chg.toFixed(2) : null, rel: 0 };
  return sectors;
}

const EMPTY_CIS = {
  total: 0, regime: 'NO DATA', regimeClass: 'neutral',
  components: {
    macro: { score: 0, weight: 0.40, contrib: 0 },
    jse:   { score: 0, weight: 0.35, contrib: 0 },
    conf:  { score: 0, weight: 0.25, contrib: 0 },
  },
};

export default function App() {
  const [page,       setPage]       = useState('overview');
  const [timeframe,  setTimeframe]  = useState('1D');
  const [returnMode, setReturnMode] = useState('ABS');

  const { assets, stocks, status, error, lastFetch, progress, fetchLive, initFromCache, env } = useMarketData();

  useEffect(() => { initFromCache(); }, []);

  const autoRefresh = useAutoRefresh(fetchLive);
  const sectors     = useMemo(() => deriveSectors(stocks), [stocks]);
  const hasData     = status === 'live' || status === 'cached';

  const cisInput = useMemo(() => ({
    brentChg:       assets.brent?.changePct     ?? 0,
    usdZarChg:      assets.usdZar?.changePct    ?? 0,
    goldChg:        assets.gold?.changePct      ?? 0,
    sa10yChg:       assets.sa10y?.changePct     ?? 0,
    top40Chg:       sectors.top40?.chg          ?? 0,
    minersChg:      sectors['Gold Miners']?.chg ?? 0,
    energyChg:      sectors.Energy?.chg         ?? 0,
    banksChg:       sectors.Banks?.chg          ?? 0,
    retailersChg:   sectors.Retailers?.chg      ?? 0,
    industrialsChg: sectors.Industrials?.chg    ?? 0,
  }), [assets, sectors]);

  const cis    = useMemo(() => hasData ? computeCIS(cisInput) : EMPTY_CIS, [hasData, cisInput]);
  const alerts = useMemo(() => hasData ? computeAlerts({ assets, sectors, stocks }) : [], [hasData, assets, sectors, stocks]);

  const handleExport = useCallback((key) => {
    if (key === 'watchlist-csv') exportWatchlistCSV(stocks, timeframe);
    if (key === 'macro-csv')     exportMacroCSV(assets);
    if (key === 'snapshot-json') exportSnapshotJSON(assets, stocks, sectors, cis, alerts);
  }, [stocks, assets, sectors, cis, alerts, timeframe]);

  const shared = { assets, stocks, sectors, cis, alerts, timeframe, returnMode, status, hasData, onFetch: fetchLive };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-tp font-sans">
      <LoadingOverlay status={status} progress={progress} error={error} env={env} onDismiss={() => {}} />
      <Sidebar page={page} setPage={setPage} cis={cis} status={status} lastFetch={lastFetch} />

      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        <TopBar
          page={page} status={status} error={error} lastFetch={lastFetch} progress={progress}
          onFetch={fetchLive}
          timeframe={timeframe}  setTimeframe={setTimeframe}
          returnMode={returnMode} setReturnMode={setReturnMode}
          autoRefresh={autoRefresh}
          onExport={handleExport}
        />
        <main className="flex-1 overflow-y-auto">
          {page === 'overview'  && <Overview          {...shared} />}
          {page === 'macro'     && <MacroTransmission {...shared} />}
          {page === 'drilldown' && <SectorDrilldown   {...shared} />}
        </main>
      </div>
    </div>
  );
}
