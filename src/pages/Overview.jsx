import React from 'react';
import RegimeBanner   from '../widgets/RegimeBanner.jsx';
import KpiGrid        from '../widgets/KpiGrid.jsx';
import HeatStrip      from '../widgets/HeatStrip.jsx';
import ScoreDecomp    from '../widgets/ScoreDecomp.jsx';
import SectorRelChart from '../widgets/SectorRelChart.jsx';
import AlertsFeed     from '../widgets/AlertsFeed.jsx';
import MorningNote    from '../widgets/MorningNote.jsx';
import Watchlist      from '../widgets/Watchlist.jsx';

function FetchPrompt({ onFetch }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">📡</div>
      <div className="font-display text-[28px] tracking-[3px] text-ts mb-2">NO LIVE DATA YET</div>
      <div className="font-mono text-[11px] text-tm mb-6 leading-relaxed max-w-sm">
        Click the button below to fetch real-time prices for all 33 JSE stocks,
        Brent crude, gold, platinum, palladium, USD/ZAR and coal — all in one request from Yahoo Finance.
      </div>
      <button
        onClick={onFetch}
        className="px-8 py-3 bg-warn text-bg font-mono text-[12px] font-semibold rounded hover:bg-warn/80 transition-colors"
      >
        ⚡ FETCH LIVE DATA NOW
      </button>
      <div className="font-mono text-[9px] text-tm mt-4">No API key required · Free · Updates in seconds</div>
    </div>
  );
}

export default function Overview({ assets, stocks, sectors, cis, alerts, timeframe, status, onFetch }) {
  const hasData = status === 'live' || status === 'cached';

  if (!hasData && status !== 'loading') {
    return (
      <div className="p-[18px] animate-fadeUp">
        <FetchPrompt onFetch={onFetch} />
      </div>
    );
  }

  return (
    <div className="p-[18px] animate-fadeUp">
      <RegimeBanner cis={cis} hasData={hasData} />
      <KpiGrid assets={assets} cis={cis} hasData={hasData} />
      <HeatStrip sectors={sectors} />

      <div className="grid grid-cols-3 gap-3.5 mb-3.5">
        <div className="col-span-1"><ScoreDecomp cis={cis} hasData={hasData} /></div>
        <div className="col-span-2"><SectorRelChart sectors={sectors} hasData={hasData} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <AlertsFeed alerts={alerts} hasData={hasData} />
        <MorningNote assets={assets} sectors={sectors} cis={cis} hasData={hasData} />
      </div>

      <Watchlist stocks={stocks} timeframe={timeframe} />
    </div>
  );
}
