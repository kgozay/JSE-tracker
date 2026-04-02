/**
 * Export utilities for JSE Conflict Watch
 */

/** Download a string as a file */
function downloadText(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export stock watchlist to CSV */
export function exportWatchlistCSV(stocks, timeframe = '1D') {
  const chgKey = timeframe === '5D' ? 'mockChg5d' : 'changePct';

  const headers = ['Name', 'Ticker', 'Sector', 'Price (ZAR)', '1D Chg %', '5D Chg %', 'Mkt Cap', 'P/E', 'Signal', 'Live Data', 'Timestamp'];

  const rows = stocks.map(s => [
    `"${s.name}"`,
    s.display,
    `"${s.sector}"`,
    (s.price ?? 0).toFixed(2),
    ((s.changePct ?? 0)).toFixed(4),
    ((s.mockChg5d ?? 0)).toFixed(4),
    `"${s.mktcap}"`,
    s.pe,
    `"${s.signal}"`,
    s.isLive ? 'YES' : 'NO',
    new Date().toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  downloadText(csv, `jse-conflict-watch-${date}.csv`, 'text/csv');
}

/** Export macro KPIs to CSV */
export function exportMacroCSV(assets) {
  const headers = ['Asset', 'Symbol', 'Price', 'Change %', 'Unit', 'Alert Level', 'Live', 'Timestamp'];
  const rows = Object.entries(assets).map(([key, a]) => [
    `"${a.name}"`,
    a.symbol ?? key,
    (a.price ?? 0).toFixed(4),
    (a.changePct ?? 0).toFixed(4),
    `"${a.unit}"`,
    a.alertLvl ?? 'none',
    a.isLive ? 'YES' : 'NO',
    new Date().toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  downloadText(csv, `jse-macro-${date}.csv`, 'text/csv');
}

/** Copy morning note text to clipboard */
export async function copyMorningNote(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Export full dashboard snapshot as JSON */
export function exportSnapshotJSON(assets, stocks, sectors, cis, alerts) {
  const snapshot = {
    meta: {
      generated:  new Date().toISOString(),
      version:    '2.0.0',
      source:     'JSE Conflict Watch',
    },
    conflictImpactScore: cis,
    assets,
    sectors,
    alerts,
    stocks: stocks.map(s => ({
      name:    s.name,
      ticker:  s.ticker,
      sector:  s.sector,
      price:   s.price,
      chg1d:   s.changePct,
      chg5d:   s.mockChg5d,
      mktcap:  s.mktcap,
      pe:      s.pe,
      signal:  s.signal,
      isLive:  !!s.isLive,
    })),
  };

  const json = JSON.stringify(snapshot, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadText(json, `jse-conflict-snapshot-${date}.json`, 'application/json');
}
