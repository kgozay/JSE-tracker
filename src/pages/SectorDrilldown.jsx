import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { Card, CardHeader } from '../widgets/Card.jsx';
import StockCard from '../widgets/StockCard.jsx';

const SECTOR_TABS = ['All', 'Gold Miners', 'PGMs', 'Energy', 'Banks', 'Retailers', 'Industrials', 'Mining', 'Telecoms'];

const SECTOR_READS = {
  All:          '**Full JSE** | Mixed regime. Offshore dual-listed names (Naspers, Richemont) partially cushioning the domestic sell-off. Net bias: BEARISH SHOCK. Key watch: USD/ZAR, SA 10Y yield.',
  'Gold Miners':'**Gold miners** are the standout beneficiaries of the current conflict backdrop. Gold at elevated levels combined with ZAR weakness creates a double tailwind — both the USD gold price and ZAR-translated revenues are elevated. ANG and GFI are the top performers. Miner Support Alert is TRIGGERED. Monitor for gold clearing $2,400 as the next key level.',
  PGMs:         '**PGM miners** are benefitting moderately. Platinum and palladium are higher but the conflict impact is less direct — autocatalyst demand concerns from a potential global slowdown partially offset the safe-haven bid. IMP and AMS leading. Sibanye underperforming on balance-sheet concerns.',
  Energy:       '**Energy-linked stocks** are the primary winners. Sasol (+3.4%) is the key beneficiary — oil price elevation directly boosts Secunda synfuels margins. Exxaro and Thungela also rising on coal price spillover. Energy Basket is in RED-HOT POSITIVE territory. Risk: sharp reversal on any de-escalation signal.',
  Banks:        '**Banks under pressure.** USD/ZAR move tightening financial conditions. Higher SA 10Y yields compress NII outlook while credit quality concerns on consumer-facing books are rising. Domestic Stress Alert is TRIGGERED. Watch SA 10Y at 10.82% — clearing 11.0% would trigger further bank de-rating.',
  Retailers:    '**Retailers severely impacted.** Transmission is rapid: ZAR weakness → import cost inflation → margin squeeze → consumer spending pressure. Shoprite and Pepkor most exposed to lower-income consumer stress. Domestic Stress Alert TRIGGERED. Highest-risk sector in the current regime.',
  Industrials:  '**Industrials mixed.** Naspers and Prosus dragged by global risk-off. Richemont has offshore European earnings as a partial offset. Bidvest shows defensive characteristics. Barloworld exposed to mining capex cycle. Net: mild bearish.',
  Mining:       '**Diversified miners mixed.** Anglo American benefits from gold and copper exposure. BHP similarly positioned. Both partially insulated from domestic SA macro stress given dollar-denominated revenues, but subject to global demand concerns if conflict triggers recession fears.',
  Telecoms:     '**Telecoms defensive but not immune.** MTN faces FX headwinds on pan-African USD-reporting business. Vodacom domestic SA exposure means consumer spend weakness is a concern. Neither a winner nor a major loser in this regime. Relative return vs Top 40: approximately neutral.',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2 font-mono">
      <div className="text-[10px] text-ts mb-1">{label}</div>
      <div className={clsx('text-[13px] font-semibold', v >= 0 ? 'text-bull' : 'text-bear')}>
        {v >= 0 ? '+' : ''}{v.toFixed(2)}%
      </div>
    </div>
  );
};

export default function SectorDrilldown({ stocks, sectors }) {
  const [activeSector, setActiveSector] = useState('All');

  const filtered = useMemo(() => {
    if (activeSector === 'All') return stocks;
    return stocks.filter(s => s.sector === activeSector);
  }, [stocks, activeSector]);

  const sectorStats = useMemo(() => {
    const avg    = filtered.reduce((a, s) => a + (s.changePct ?? 0), 0) / (filtered.length || 1);
    const bulls  = filtered.filter(s => (s.changePct ?? 0) > 0).length;
    const bears  = filtered.filter(s => (s.changePct ?? 0) <= 0).length;
    const liveN  = filtered.filter(s => s.isLive).length;
    return { avg, bulls, bears, liveN };
  }, [filtered]);

  const chartData = useMemo(() =>
    [...filtered]
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
      .map(s => ({ name: s.display, val: +(s.changePct ?? 0).toFixed(2), isLive: s.isLive })),
    [filtered]
  );

  const readText  = SECTOR_READS[activeSector] ?? SECTOR_READS.All;

  // Sector aggregate for header KPIs
  const sectorInfo = sectors[activeSector] ?? sectors.top40;

  return (
    <div className="p-[18px] animate-fadeUp">
      {/* Sector tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {SECTOR_TABS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSector(s)}
            className={clsx(
              'px-3 py-1.5 font-mono text-[9px] tracking-[1px] rounded border transition-all',
              activeSector === s
                ? 'text-warn border-warn bg-warn/7'
                : 'text-ts border-bd bg-bg-c hover:text-tp hover:border-ts'
            )}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2.5 mb-3.5">
        {[
          {
            label: 'AVG CHANGE',
            value: `${sectorStats.avg >= 0 ? '+' : ''}${sectorStats.avg.toFixed(2)}%`,
            sub: '1D return',
            color: sectorStats.avg >= 0 ? 'text-bull' : 'text-bear',
            barColor: sectorStats.avg >= 0 ? 'before:bg-bull' : 'before:bg-bear',
          },
          { label: 'NAMES TRACKED', value: filtered.length, sub: `${sectorStats.liveN} live`,         color: 'text-tp', barColor: 'before:bg-ts'   },
          { label: 'ADVANCING',     value: sectorStats.bulls, sub: `${filtered.length} total`,         color: 'text-bull', barColor: 'before:bg-bull' },
          { label: 'DECLINING',     value: sectorStats.bears, sub: `${sectorStats.bears} risk names`,  color: 'text-bear', barColor: 'before:bg-bear' },
        ].map(k => (
          <div key={k.label} className={clsx(
            'bg-bg-c border border-bd rounded p-[11px] relative overflow-hidden',
            'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]',
            k.barColor,
          )}>
            <div className="font-mono text-[8px] tracking-[2px] text-ts mb-1.5">{k.label}</div>
            <div className={clsx('font-display text-[32px] leading-none', k.color)}>{k.value}</div>
            <div className="font-mono text-[8px] text-tm mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Read */}
      <div className="grid grid-cols-3 gap-3 mb-3.5">
        <div className="col-span-2">
          <Card>
            <CardHeader
              title={`${activeSector.toUpperCase()} — Constituent Performance`}
              badge={`${filtered.length} STOCKS`}
              badgeVariant="live"
            />
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(30,45,69,0.8)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#6e80a0' }}
                    axisLine={false} tickLine={false}
                    interval={0}
                    angle={chartData.length > 12 ? -45 : 0}
                    textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                    height={chartData.length > 12 ? 36 : 20}
                  />
                  <YAxis
                    tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                    tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6e80a0' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                  <Bar dataKey="val" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.val >= 0 ? 'rgba(5,208,154,0.7)' : 'rgba(239,68,68,0.7)'}
                        stroke={entry.val >= 0 ? '#05d09a' : '#ef4444'}
                        strokeWidth={entry.isLive ? 2 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Sector read */}
        <Card>
          <CardHeader title="Conflict Impact — Sector Read" />
          <div className="font-mono text-[10px] leading-[1.8] text-ts">
            {readText.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <span key={i} className="text-warn font-semibold">{part.slice(2, -2)}</span>
                : <span key={i}>{part}</span>
            )}
          </div>

          {sectorInfo && (
            <div className="mt-3 pt-3 border-t border-bd-x">
              <div className="font-mono text-[8px] text-tm mb-1.5">SECTOR AGGREGATE</div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-ts">1D Change</span>
                <span className={sectorInfo.chg >= 0 ? 'text-bull font-semibold' : 'text-bear font-semibold'}>
                  {sectorInfo.chg >= 0 ? '+' : ''}{sectorInfo.chg?.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between font-mono text-[10px] mt-1">
                <span className="text-ts">vs Top 40</span>
                <span className={(sectorInfo.rel ?? 0) >= 0 ? 'text-bull' : 'text-bear'}>
                  {(sectorInfo.rel ?? 0) >= 0 ? '+' : ''}{sectorInfo.rel?.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Stock grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {filtered.map(s => <StockCard key={s.ticker} stock={s} />)}
      </div>
    </div>
  );
}
