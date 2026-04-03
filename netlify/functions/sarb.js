/**
 * SARB R2035 Bond Yield Proxy
 * Netlify Serverless Function — NO API KEY REQUIRED
 *
 * Primary:  SARB REST API (custom.resbank.co.za/SarbWebApi)
 *           Series: MMRBGBR2035 — R2035 8.875% Dec 2035 benchmark yield
 * Fallback: FRED API (optional free key) → IRLTLT01ZAM156N (SA long rates)
 *
 * GET /.netlify/functions/sarb
 */

const https = require('https');

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=300',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JSE-ConflictWatch/2.0)',
        'Accept': 'application/json, text/plain, */*',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, body, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body, json: null }); }
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error('Timeout')));
    req.on('error', reject);
  });
}

const ok  = b => ({ statusCode: 200, headers: CORS, body: JSON.stringify(b) });
const err = (m, c=502) => ({ statusCode: c, headers: CORS, body: JSON.stringify({ error: m }) });

/**
 * Parse SARB WebIndicators response.
 * SARB returns: { TimeseriesCode, Description, Frequency, data: [{Date, Value}] }
 * Values are daily — we want the latest two to compute daily change.
 */
function parseSARB(json, seriesCode) {
  if (!json || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(`No data in SARB response for ${seriesCode}`);
  }
  // Sort descending by date to get latest first
  const sorted = [...json.data]
    .filter(d => d.Value !== null && d.Value !== undefined && d.Value !== '')
    .sort((a, b) => new Date(b.Date) - new Date(a.Date));

  if (sorted.length === 0) throw new Error('All SARB values are null');

  const latest = sorted[0];
  const prev   = sorted[1] ?? sorted[0];

  const price     = parseFloat(latest.Value);
  const prevClose = parseFloat(prev.Value);
  const change    = +(price - prevClose).toFixed(4);
  const changePct = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(4) : 0;

  return {
    symbol:      seriesCode,
    name:        json.Description ?? 'R2035 8.875% 2035',
    price,
    change,
    changePct,
    prevClose,
    date:        latest.Date,
    prevDate:    prev.Date,
    frequency:   json.Frequency ?? 'Daily',
    source:      'SARB',
    currency:    'ZAR',
    unit:        '%',
    timestamp:   new Date().toISOString(),
  };
}

/**
 * Parse FRED API observations response.
 * Returns: { observations: [{date, value}] }
 */
function parseFRED(json) {
  if (!json?.observations?.length) throw new Error('No FRED observations');
  const obs = json.observations.filter(o => o.value !== '.');
  if (!obs.length) throw new Error('All FRED values are missing');
  const sorted = [...obs].sort((a,b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  const prev   = sorted[1] ?? sorted[0];
  const price     = parseFloat(latest.value);
  const prevClose = parseFloat(prev.value);
  const change    = +(price - prevClose).toFixed(4);
  const changePct = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(4) : 0;
  return {
    symbol:    'IRLTLT01ZAM156N',
    name:      'SA Long-Term Rate (FRED proxy)',
    price, change, changePct, prevClose,
    date:      latest.date,
    source:    'FRED',
    currency:  'ZAR',
    unit:      '%',
    timestamp: new Date().toISOString(),
    isProxy:   true,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const FRED_KEY = process.env.FRED_API_KEY ?? '';

  // ── Primary: SARB REST API ───────────────────────────────────────────────
  // SARB series codes for R2035 benchmark bond yield
  // The SARB WebIndicators REST API is free, public, no authentication required.
  // Endpoint: https://custom.resbank.co.za/SarbWebApi/WebIndicators/{SeriesCode}/
  // Series hierarchy: MMRB = Money Market Rates, Bond; GB = Government Bond
  const SARB_SERIES = [
    'MMRBGBR2035',  // R2035 8.875% Dec 2035 — primary target
    'MMRBGB10Y',    // 10-year government benchmark — fallback
    'MMRBGBR2030',  // R2030 — secondary fallback
  ];

  for (const series of SARB_SERIES) {
    try {
      const url = `https://custom.resbank.co.za/SarbWebApi/WebIndicators/${series}/`;
      const res = await get(url);

      if (res.status === 200 && res.json) {
        const data = parseSARB(res.json, series);
        console.log(`[sarb] ✓ ${series} → ${data.price}%`);
        return ok({ bond: data, series });
      }
      console.warn(`[sarb] ${series} returned ${res.status}`);
    } catch (e) {
      console.warn(`[sarb] ${series} failed: ${e.message}`);
    }
  }

  // ── Fallback: FRED API ───────────────────────────────────────────────────
  // FRED series IRLTLT01ZAM156N = SA Long-term interest rates (monthly)
  // Free API key from fred.stlouisfed.org — set FRED_API_KEY in Netlify env vars
  // Works without a key but rate-limited; add key for reliability
  if (FRED_KEY || true) { // always try FRED
    try {
      const fredUrl = `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=IRLTLT01ZAM156N` +
        `&api_key=${FRED_KEY || 'abcdefghijklmnopqrstuvwxyz012345'}` +
        `&sort_order=desc&limit=5&file_type=json`;
      const res = await get(fredUrl);
      if (res.status === 200 && res.json) {
        const data = parseFRED(res.json);
        console.log(`[sarb] FRED fallback → ${data.price}%`);
        return ok({ bond: data, series: 'FRED_FALLBACK', warning: 'Using FRED proxy — add FRED_API_KEY env var and set up SARB series for live R2035 data' });
      }
    } catch (e) {
      console.warn(`[sarb] FRED failed: ${e.message}`);
    }
  }

  return err('Could not fetch R2035 yield from SARB or FRED. Both sources unavailable. Check Netlify function logs.');
};
