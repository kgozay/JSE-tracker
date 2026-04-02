/**
 * Alert logic engine
 * Returns a list of triggered alerts with severity, tag, label, text
 */
export function computeAlerts({ assets, sectors, stocks }) {
  const alerts = [];
  const now = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  const brent   = assets.brent?.changePct   ?? 0;
  const usdZar  = assets.usdZar?.changePct  ?? 0;
  const gold    = assets.gold?.changePct    ?? 0;
  const top40   = sectors.top40?.chg        ?? 0;
  const banks   = sectors.Banks?.chg        ?? 0;
  const retail  = sectors.Retailers?.chg    ?? 0;
  const miners  = sectors['Gold Miners']?.chg ?? 0;
  const energy  = sectors.Energy?.chg       ?? 0;

  // ── Thematic composite alerts ─────────────────────────────────────────────
  if (brent > 3 && usdZar > 0.8) {
    alerts.push({
      id: 'oil-shock', lvl: 'red', tag: 'os', label: 'OIL SHOCK ALERT',
      text: `COMPOSITE: Brent +${brent.toFixed(1)}% AND ZAR +${usdZar.toFixed(1)}% simultaneously active. Double CPI transmission chain engaged.`,
      time: now,
    });
  }

  if (usdZar > 1 && banks < -1.5 && retail < -1.5) {
    alerts.push({
      id: 'domestic-stress', lvl: 'red', tag: 'ds', label: 'DOMESTIC STRESS',
      text: `COMPOSITE: ZAR +${usdZar.toFixed(1)}% + Banks ${banks.toFixed(1)}% + Retailers ${retail.toFixed(1)}%. SA consumer stress regime confirmed.`,
      time: now,
    });
  }

  if (gold > 1.5 && usdZar > 0.5 && miners > top40 + 1) {
    alerts.push({
      id: 'miner-support', lvl: 'green', tag: 'ms', label: 'MINER SUPPORT',
      text: `COMPOSITE: Gold +${gold.toFixed(1)}% + ZAR hedge active. Gold miners +${miners.toFixed(1)}% outperforming Top 40 by ${(miners - top40).toFixed(1)}%.`,
      time: now,
    });
  }

  if (brent < -2 && usdZar < 0.3 && top40 > 1) {
    alerts.push({
      id: 'deescalation', lvl: 'green', tag: 'ms', label: 'DE-ESCALATION RELIEF',
      text: `COMPOSITE: Brent ${brent.toFixed(1)}%, ZAR stable, Top 40 +${top40.toFixed(1)}%. Conflict relief rally underway.`,
      time: now,
    });
  }

  // ── Individual threshold alerts ───────────────────────────────────────────
  if (brent > 4) {
    alerts.push({
      id: 'brent-red', lvl: 'red', tag: 'in', label: 'BRENT CRITICAL',
      text: `Brent +${brent.toFixed(1)}% — red threshold (>+4%) breached. Fuel levy pass-through imminent within 2 billing cycles.`,
      time: now,
    });
  } else if (brent > 2) {
    alerts.push({
      id: 'brent-amber', lvl: 'amber', tag: 'in', label: 'BRENT AMBER',
      text: `Brent +${brent.toFixed(1)}% — amber threshold (>+2%) triggered. SA fuel price pressure building.`,
      time: now,
    });
  }

  if (usdZar > 1.5) {
    alerts.push({
      id: 'zar-red', lvl: 'red', tag: 'ds', label: 'ZAR CRITICAL',
      text: `USD/ZAR +${usdZar.toFixed(1)}% — critical threshold (>+1.5%) breached. SARB intervention risk elevated.`,
      time: now,
    });
  } else if (usdZar > 0.8) {
    alerts.push({
      id: 'zar-amber', lvl: 'amber', tag: 'ds', label: 'ZAR AMBER',
      text: `USD/ZAR +${usdZar.toFixed(1)}% — amber threshold (>+0.8%) triggered. Import inflation pass-through accelerating.`,
      time: now,
    });
  }

  if (gold > 2) {
    alerts.push({
      id: 'gold-red', lvl: 'amber', tag: 'ms', label: 'GOLD SURGE',
      text: `Gold +${gold.toFixed(1)}% — red threshold (>+2%) exceeded. Strong safe-haven demand. JSE gold miners outperforming.`,
      time: now,
    });
  } else if (gold > 1) {
    alerts.push({
      id: 'gold-amber', lvl: 'amber', tag: 'ms', label: 'GOLD AMBER',
      text: `Gold +${gold.toFixed(1)}% — amber threshold (>+1%) triggered. Risk-off safe-haven demand building.`,
      time: now,
    });
  }

  if (top40 < -2) {
    alerts.push({
      id: 'top40-red', lvl: 'red', tag: 'in', label: 'TOP 40 SELLOFF',
      text: `JSE Top 40 ${top40.toFixed(1)}% — red threshold (<-2%) breached. Broad-based risk-off selling underway.`,
      time: now,
    });
  } else if (top40 < -1) {
    alerts.push({
      id: 'top40-amber', lvl: 'amber', tag: 'in', label: 'TOP 40 AMBER',
      text: `JSE Top 40 ${top40.toFixed(1)}% — amber threshold (<-1%) triggered. Foreign portfolio outflows suspected.`,
      time: now,
    });
  }

  if (energy > 4) {
    alerts.push({
      id: 'energy-hot', lvl: 'green', tag: 'ms', label: 'ENERGY RED-HOT',
      text: `Energy basket +${energy.toFixed(1)}% — RED-HOT positive threshold (>+4%). Sasol/coal exporters benefiting strongly.`,
      time: now,
    });
  } else if (energy > 2) {
    alerts.push({
      id: 'energy-amber', lvl: 'green', tag: 'ms', label: 'ENERGY BULLISH',
      text: `Energy basket +${energy.toFixed(1)}% — amber positive threshold (>+2%). Oil price tailwind active for SA energy names.`,
      time: now,
    });
  }

  return alerts.slice(0, 8);
}

/**
 * Compute alert dot level for a single asset
 */
export function getAssetAlertLevel(key, changePct) {
  const thresholds = {
    brent:    { amber: 2,   red: 4,   bearish: true  },
    usdZar:   { amber: 0.8, red: 1.5, bearish: true  },
    gold:     { amber: 1,   red: 2,   bearish: false  },
    platinum: { amber: 1.5, red: 3,   bearish: false  },
    palladium:{ amber: 1.5, red: 3,   bearish: false  },
    coal:     { amber: 2,   red: 4,   bearish: false  },
    sa10y:    { amber: 0.1, red: 0.2, bearish: true   },
  };
  const t = thresholds[key];
  if (!t) return null;
  const val = t.bearish ? changePct : Math.abs(changePct);
  if (val > t.red)   return 'red';
  if (val > t.amber) return 'amber';
  return null;
}
