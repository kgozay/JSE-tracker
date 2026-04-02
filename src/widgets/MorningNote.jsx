import React from 'react';
import { Card, CardHeader } from './Card.jsx';

function Hi({ c, children }) {
  const cls = c === 'bull' ? 'text-bull font-semibold' : c === 'bear' ? 'text-bear font-semibold' : 'text-warn font-semibold';
  return <span className={cls}>{children}</span>;
}

function dash(v, suffix = '') { return v == null ? '—' : `${v}${suffix}`; }
function pct(v)  { return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; }
function price(v, dp = 2) { return v == null ? '—' : v.toFixed(dp); }

export default function MorningNote({ assets, sectors, cis, hasData }) {
  if (!hasData) {
    return (
      <Card className="h-full">
        <CardHeader title="Auto-Generated Morning Note" badge="AI GENERATED" badgeVariant="live" />
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm text-center">
          Note generated after live data is fetched
        </div>
      </Card>
    );
  }

  const brent  = assets.brent;
  const usdZar = assets.usdZar;
  const gold   = assets.gold;
  const sa10y  = assets.sa10y;
  const top40  = sectors.top40;
  const mining = sectors['Gold Miners'];
  const energy = sectors.Energy;
  const now    = new Date();
  const date   = now.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <Card className="h-full">
      <CardHeader title="Auto-Generated Morning Note" badge="AI GENERATED" badgeVariant="live" />
      <div className="font-mono text-[10.5px] leading-[1.9] text-ts space-y-2.5">
        <div className="text-warn font-semibold tracking-[0.5px] block">
          ▸ MORNING NOTE · {date.toUpperCase()} · {now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})} SAST
        </div>
        <p>
          Global markets are pricing Iran–Israel conflict risk following IRGC activity near the Strait of Hormuz.{' '}
          <Hi c="warn">Brent {pct(brent?.changePct)} to ${price(brent?.price)}/bbl</Hi>,{' '}
          {(brent?.changePct ?? 0) > 4 ? 'breaching the RED oil shock threshold.' : 'triggering our amber oil shock threshold.'}
        </p>
        <p>
          <Hi c="bear">JSE Top 40 {pct(top40?.chg)}</Hi> at the open.{' '}
          <Hi c="warn">USD/ZAR R{price(usdZar?.price, 3)} ({pct(usdZar?.changePct)})</Hi>{' '}
          amplifies import cost pressures across the consumer-facing book.
        </p>
        <p>
          Key divergence:{' '}
          <Hi c="bull">gold miners {pct(mining?.chg)}</Hi> and{' '}
          <Hi c="bull">energy basket {pct(energy?.chg)}</Hi>{' '}
          provide a partial JSE offset. Gold at <Hi c="bull">${price(gold?.price, 0)}/oz</Hi> is the standout safe-haven bid.
        </p>
        <p>
          CIS: <Hi c="warn">{cis.total}</Hi> (<Hi c="warn">{cis.regime}</Hi>).
          SA 10Y at {dash(sa10y?.price?.toFixed(2), '%')} — 11.0% is key resistance. Monitor OPEC+ emergency stance.
        </p>
      </div>
    </Card>
  );
}
