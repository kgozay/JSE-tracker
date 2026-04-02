import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Card, CardHeader } from '../widgets/Card.jsx';
import clsx from 'clsx';

// ─── Channel Flow Card ────────────────────────────────────────────────────
function FlowNode({ variant, children }) {
  const cls = {
    red:    'bg-bear/8 text-bear border border-bear/35',
    warn:   'bg-warn/8 text-warn border border-warn/35',
    green:  'bg-bull/8 text-bull border border-bull/35',
    neutral:'bg-bg-e text-ts border border-bd',
  };
  return (
    <span className={clsx('px-2 py-1 rounded font-mono text-[8px] tracking-[0.5px]', cls[variant] ?? cls.neutral)}>
      {children}
    </span>
  );
}
function Arrow() { return <span className="text-tm text-[10px]">→</span>; }

function ChannelCard({ icon, title, rows, impact, impactColor, active }) {
  return (
    <Card>
      <div className="flex items-center gap-2 font-mono text-[9px] tracking-[2px] text-ts uppercase mb-3">
        <span className="text-base">{icon}</span>
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1.5 flex-wrap">
            {row.map((node, ni) =>
              ni === 0
                ? <FlowNode key={ni} variant={node.v}>{node.t}</FlowNode>
                : <React.Fragment key={ni}><Arrow /><FlowNode variant={node.v}>{node.t}</FlowNode></React.Fragment>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-bd-x">
        <div>
          <div className="font-mono text-[8px] text-tm">NET SECTOR IMPACT</div>
          <div className={clsx('font-mono text-[12px] font-semibold mt-0.5', impactColor)}>{impact}</div>
        </div>
        <span className={clsx(
          'font-mono text-[8px] px-2 py-0.5 rounded',
          active
            ? 'bg-bear/15 text-bear border border-bear/40'
            : 'bg-bg-e text-tm border border-bd'
        )}>
          {active ? '● ACTIVE' : '○ DORMANT'}
        </span>
      </div>
    </Card>
  );
}

// ─── Historical Analogues ─────────────────────────────────────────────────
const ANALOGUES = [
  { event: 'Gulf War I',       period: 'Aug 1990–Feb 1991', brent:'+74%', zar:'+22%', top40:'-14%', gold:'+8%',  miners:'+11%', regime:'BEARISH' },
  { event: 'Kosovo Crisis',    period: 'Mar–Jun 1999',       brent:'+32%', zar:'+9%',  top40:'-7%',  gold:'+4%',  miners:'+6%',  regime:'BEARISH' },
  { event: 'Iraq War',         period: 'Mar–May 2003',       brent:'+41%', zar:'+14%', top40:'+6%',  gold:'+12%', miners:'+18%', regime:'MIXED'   },
  { event: 'Libya Conflict',   period: 'Feb–Oct 2011',       brent:'+25%', zar:'+11%', top40:'-5%',  gold:'+9%',  miners:'+14%', regime:'BEARISH' },
  { event: 'Russia–Ukraine',   period: 'Feb–Sep 2022',       brent:'+58%', zar:'+18%', top40:'-9%',  gold:'+11%', miners:'+22%', regime:'BEARISH' },
  { event: 'Oct 7 Hamas',      period: 'Oct–Dec 2023',       brent:'+12%', zar:'+8%',  top40:'-4%',  gold:'+7%',  miners:'+9%',  regime:'MIXED'   },
];

// ─── Yield Chart ──────────────────────────────────────────────────────────
const YIELD_DATA = [
  { month: 'Apr 25', sa10y: 10.18, sarb: 8.25 },
  { month: 'May',    sa10y: 10.32, sarb: 8.25 },
  { month: 'Jun',    sa10y: 10.28, sarb: 8.25 },
  { month: 'Jul',    sa10y: 10.44, sarb: 8.25 },
  { month: 'Aug',    sa10y: 10.56, sarb: 8.00 },
  { month: 'Sep',    sa10y: 10.48, sarb: 8.00 },
  { month: 'Oct',    sa10y: 10.62, sarb: 8.00 },
  { month: 'Nov',    sa10y: 10.58, sarb: 8.00 },
  { month: 'Dec',    sa10y: 10.72, sarb: 7.75 },
  { month: 'Jan 26', sa10y: 10.64, sarb: 7.75 },
  { month: 'Feb',    sa10y: 10.58, sarb: 7.75 },
  { month: 'Mar',    sa10y: 10.64, sarb: 7.75 },
  { month: 'Apr 26', sa10y: 10.82, sarb: 7.75 },
];

const TICK_STYLE = { fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#6e80a0' };

const YieldTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-s border border-bd rounded px-3 py-2 font-mono text-[10px]">
      <div className="text-ts mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(2)}%</div>
      ))}
    </div>
  );
};

// ─── Sensitivity Matrix ───────────────────────────────────────────────────
const SENSITIVITY = [
  { sector: 'Energy / Sasol',    s75: '+1.2%', s85: '+2.8%', s92: '+3.4%', s100: '+5.1%', s115: '+8.4%' },
  { sector: 'Coal Exporters',    s75: '+0.8%', s85: '+1.6%', s92: '+2.2%', s100: '+3.4%', s115: '+5.8%' },
  { sector: 'Gold Miners',       s75: '0.0%',  s85: '+0.4%', s92: '+0.8%', s100: '+1.2%', s115: '+2.0%' },
  { sector: 'PGM Miners',        s75: '0.0%',  s85: '+0.3%', s92: '+0.6%', s100: '+0.9%', s115: '+1.4%' },
  { sector: 'JSE Top 40',        s75: '0.0%',  s85: '-0.6%', s92: '-1.4%', s100: '-2.2%', s115: '-4.1%' },
  { sector: 'Banks',             s75: '0.0%',  s85: '-0.8%', s92: '-1.9%', s100: '-2.8%', s115: '-4.8%' },
  { sector: 'Retailers',         s75: '0.0%',  s85: '-1.0%', s92: '-2.1%', s100: '-3.2%', s115: '-5.6%' },
  { sector: 'Industrials',       s75: '0.0%',  s85: '-0.5%', s92: '-1.1%', s100: '-1.8%', s115: '-3.2%' },
];

function cellClass(val) {
  const n = parseFloat(val);
  if (n >= 4)   return 'bg-bull/22 text-bull';
  if (n >= 1.5) return 'bg-bull/10 text-bull/80';
  if (n >= 0.3) return 'bg-bull/6  text-bull/60';
  if (n <= -4)  return 'bg-bear/38 text-red-300';
  if (n <= -2)  return 'bg-bear/22 text-red-400';
  if (n <= -0.3)return 'bg-bear/10 text-red-500';
  return 'bg-bg-e text-ts';
}

// ─── Alert Status ─────────────────────────────────────────────────────────
const ALERT_SIGNALS = [
  { icon: '🛢️', name: 'Oil Shock Alert',         detail: 'Brent >+3% AND ZAR >+0.8%',           status: 'triggered', tag: 'red'   },
  { icon: '🏠', name: 'Domestic Stress Alert',    detail: 'ZAR >+1% AND Banks <-1.5% AND Retail <-1.5%', status: 'triggered', tag: 'red'   },
  { icon: '⛏️', name: 'Miner Support Alert',      detail: 'Gold >+1.5% AND ZAR >+0.5% AND Miners >Top40 by 1%', status: 'triggered', tag: 'green' },
  { icon: '☮️', name: 'De-escalation Relief',     detail: 'Brent <-2% AND ZAR stable AND Top40 >+1%', status: 'off', tag: 'off' },
  { icon: '🔴', name: 'Brent >+4% Critical',      detail: 'Hard red threshold',                   status: 'amber:+3.8%', tag: 'amber' },
  { icon: '🔴', name: 'USD/ZAR >+1.5% Critical',  detail: 'Hard red threshold',                   status: 'amber:+1.2%', tag: 'amber' },
  { icon: '🟡', name: 'Gold >+2% Amber',          detail: 'Hard amber threshold',                 status: 'amber:+1.8%', tag: 'amber' },
  { icon: '📊', name: 'Top 40 <-1% Amber',        detail: 'Hard amber threshold',                 status: 'amber:-1.4%', tag: 'amber' },
];

const SIGNAL_TAG = {
  red:   'bg-bear/12 text-bear border border-bear/35 font-semibold',
  green: 'bg-bull/12 text-bull border border-bull/35 font-semibold',
  amber: 'bg-warn/12 text-warn border border-warn/35',
  off:   'bg-bg-e text-tm border border-bd',
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function MacroTransmission({ assets }) {
  const brentChg  = assets.brent?.changePct ?? 3.84;
  const zarChg    = assets.usdZar?.changePct ?? 1.23;
  const goldChg   = assets.gold?.changePct  ?? 1.84;

  return (
    <div className="p-[18px] animate-fadeUp space-y-3.5">
      {/* Transmission channels */}
      <div className="grid grid-cols-2 gap-3">
        <ChannelCard
          icon="🛢️" title="Oil Price Shock Channel" active
          impactColor="text-bear" impact="JSE BANKS / RETAILERS: ↓"
          rows={[
            [{ v:'red', t:`Brent +${brentChg.toFixed(1)}%` }, { v:'warn', t:'Fuel Levy↑' }, { v:'warn', t:'CPI↑' }, { v:'red', t:'SARB Hawkish' }],
            [{ v:'red', t:'Rates Hold/↑' }, { v:'red', t:'Bond Sell-off' }, { v:'red', t:'Banks NII↓' }, { v:'red', t:'JSE Banks↓' }],
            [{ v:'green', t:'Sasol Rev.↑' }, { v:'green', t:'Coal/Gas↑' }, { v:'green', t:'Energy Basket↑' }],
          ]}
        />
        <ChannelCard
          icon="💱" title="Currency Pressure Channel" active
          impactColor="text-bear" impact="RETAILERS / INDUSTRIALS: ↓↓"
          rows={[
            [{ v:'red', t:`USD/ZAR +${zarChg.toFixed(1)}%` }, { v:'warn', t:'Import CPI↑' }, { v:'red', t:'Retail Margins↓' }],
            [{ v:'red', t:'Consumer Conf.↓' }, { v:'red', t:'SA Spending↓' }, { v:'red', t:'Retail Rev.↓' }],
            [{ v:'red', t:'USD Debt Cost↑' }, { v:'red', t:'Corp. Margins↓' }, { v:'neutral', t:'Offshore JSE∼' }],
          ]}
        />
        <ChannelCard
          icon="🥇" title="Safe Haven / Mining Channel" active
          impactColor="text-bull" impact="GOLD MINERS / PGMs: ↑"
          rows={[
            [{ v:'green', t:`Gold +${goldChg.toFixed(1)}%` }, { v:'green', t:'Mining Rev.↑' }, { v:'green', t:'GFI/ANG↑' }],
            [{ v:'green', t:'PGMs +1.1%' }, { v:'green', t:'IMP/AMS↑' }, { v:'green', t:'Mining Basket↑' }],
            [{ v:'warn', t:'ZAR Weak' }, { v:'green', t:'ZAR-denom Rev.↑↑' }, { v:'green', t:'Miner Margins↑' }],
          ]}
        />
        <ChannelCard
          icon="📉" title="Global Risk-Off Channel" active
          impactColor="text-bear" impact="JSE TOP 40: ↓ | PARTIAL OFFSET"
          rows={[
            [{ v:'red', t:'Geopolitical Risk↑' }, { v:'red', t:'EM Risk-off' }, { v:'red', t:'SA FDI Outflows' }],
            [{ v:'red', t:'JSE FPI Selling' }, { v:'red', t:'Valuation Contraction' }, { v:'red', t:'Top 40↓' }],
            [{ v:'neutral', t:'Naspers/CFR' }, { v:'neutral', t:'Offshore Anchor' }, { v:'neutral', t:'Partial Offset' }],
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Historical analogues */}
        <div className="col-span-2">
          <Card>
            <CardHeader title="Historical Conflict Analogues — SA Market Reaction" badge="6 EVENTS" />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[10px]">
                <thead>
                  <tr>
                    {['Event','Period','Brent','USD/ZAR','JSE Top 40','Gold','SA Miners','Regime'].map(h => (
                      <th key={h} className="text-[8px] tracking-[1.5px] text-tm py-1.5 px-2 border-b border-bd bg-bg-s text-left whitespace-nowrap">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ANALOGUES.map(row => (
                    <tr key={row.event} className="hover:bg-bg-h transition-colors">
                      <td className="py-2 px-2 border-b border-bd-x font-semibold text-tp whitespace-nowrap">{row.event}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-tm text-[9px] whitespace-nowrap">{row.period}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.brent}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bear font-semibold">{row.zar}</td>
                      <td className={clsx('py-2 px-2 border-b border-bd-x font-semibold', row.top40.startsWith('+') ? 'text-bull' : 'text-bear')}>{row.top40}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.gold}</td>
                      <td className="py-2 px-2 border-b border-bd-x text-bull font-semibold">{row.miners}</td>
                      <td className="py-2 px-2 border-b border-bd-x">
                        <span className={clsx('px-1.5 py-0.5 rounded-sm text-[8px] border font-semibold',
                          row.regime === 'BEARISH' ? 'bg-bear/15 text-bear border-bear/30' :
                          row.regime === 'MIXED'   ? 'bg-warn/15 text-warn border-warn/30' :
                          'bg-bull/12 text-bull border-bull/30')}>
                          {row.regime}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Alert status */}
        <Card>
          <CardHeader title="Alert Signal Status" badge="LIVE" badgeVariant="live" />
          <div className="space-y-0 divide-y divide-bd-x">
            {ALERT_SIGNALS.map(sig => (
              <div key={sig.name} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-ts">{sig.icon} {sig.name}</div>
                  <div className="font-mono text-[8px] text-tm mt-0.5">{sig.detail}</div>
                </div>
                <span className={clsx('font-mono text-[8px] px-1.5 py-0.5 rounded-sm whitespace-nowrap flex-shrink-0', SIGNAL_TAG[sig.tag])}>
                  {sig.status === 'triggered' ? '● TRIGGERED' : sig.status === 'off' ? 'NOT TRIGGERED' : sig.status.replace(':', ': ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sensitivity matrix */}
        <Card>
          <CardHeader title="JSE Sector Sensitivity — Brent Price Scenarios" badge="ESTIMATED IMPACT" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[10px]">
              <thead>
                <tr>
                  {['Sector', '$75 Base', '$85', '$92 Now', '$100', '$115 Shock'].map(h => (
                    <th key={h} className="text-[8px] tracking-[1px] text-ts py-1.5 px-2.5 border border-bd-x bg-bg-s text-center first:text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SENSITIVITY.map(row => (
                  <tr key={row.sector}>
                    <td className="py-1.5 px-2.5 border border-bd-x text-ts text-[9px] bg-bg-s whitespace-nowrap">{row.sector}</td>
                    {[row.s75, row.s85, row.s92, row.s100, row.s115].map((v, i) => (
                      <td key={i} className={clsx('py-1.5 px-2.5 border border-bd-x text-center', cellClass(v))}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Yield chart */}
        <Card>
          <CardHeader title="SA 10Y Yield + SARB Repo Rate Path" badge="13-MONTH" />
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={YIELD_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="rgba(30,45,69,0.8)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} interval={2} />
                <YAxis
                  domain={[7.5, 11.2]}
                  tickFormatter={v => `${v.toFixed(1)}%`}
                  tick={TICK_STYLE} axisLine={false} tickLine={false}
                />
                <Tooltip
                  content={<YieldTooltip />}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#6e80a0', paddingTop: 4 }}
                />
                <ReferenceLine y={11.0} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" label={{ value: '11% resistance', position: 'insideTopRight', fontSize: 8, fill: '#ef4444', fontFamily: 'IBM Plex Mono' }} />
                <Line type="monotone" dataKey="sa10y" name="SA 10Y Yield" stroke="#f0b429" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="sarb"  name="SARB Repo"   stroke="rgba(5,208,154,0.7)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
