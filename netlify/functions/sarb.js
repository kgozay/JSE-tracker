/**
 * JSE Conflict Watch — SARB R2035 Bond Yield Proxy
 * Netlify Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * Primary:  SARB REST API — custom.resbank.co.za/SarbWebApi/WebIndicators/
 *           Tries R2035 → MMRBGB10Y → MMRBGBR2030 in order
 * Fallback: FRED API (set FRED_API_KEY env var in Netlify for reliability)
 *
 * GET /.netlify/functions/sarb
 */

const https = require('https');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JSE-ConflictWatch/3.0)',
        'Accept':     'application/json, text/plain, */*',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.setTimeout(9000, () => req.destroy(new Error('SARB request timed out')));
    req.on('error', reject);
  });
}

const ok  = body       => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (msg, c=502) => ({ statusCode: c,   headers: CORS, body: JSON.stringify({ error: msg }) });

/* ── Parse SARB WebIndicators JSON ───────────────────────────────── */
function parseSARB(json, series) {
  if (!json || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(`SARB ${series}: empty data array`);
  }
  const rows = json.data
    .filter(d => d.Value !== null && d.Value !== '' && d.Value !== undefined)
    .sort((a, b) => new Date(b.Date) - new Date(a.Date));

  if (rows.length === 0) throw new Error(`SARB ${series}: all values null`);

  const latest    = rows[0];
  const prev      = rows[1] ?? rows[0];
  const price     = parseFloat(latest.Value);
  const prevClose = parseFloat(prev.Value);
  const change    = +(price - prevClose).toFixed(4);
  const changePct = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(4) : 0;

  return {
    symbol:    series,
    name:      json.Description ?? `${series} Bond Yield`,
    price,
    change,
    changePct,
    prevClose,
    date:      latest.Date,
    frequency: json.Frequency ?? 'Daily',
    source:    'SARB',
    unit:      '%',
    currency:  'ZAR',
    timestamp: new Date().toISOString(),
  };
}

/* ── Parse FRED observations ─────────────────────────────────────── */
function parseFRED(json) {
  const obs = (json?.observations ?? []).filter(o => o.value !== '.' && o.value);
  if (!obs.length) throw new Error('FRED: no observations');
  const sorted = obs.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest    = sorted[0];
  const prev      = sorted[1] ?? sorted[0];
  const price     = parseFloat(latest.value);
  const prevClose = parseFloat(prev.value);
  const change    = +(price - prevClose).toFixed(4);
  const changePct = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(4) : 0;
  return {
    symbol:    'IRLTLT01ZAM156N',
    name:      'SA Long-Term Rate (FRED proxy for R2035)',
    price, change, changePct, prevClose,
    date:      latest.date,
    source:    'FRED',
    unit:      '%',
    currency:  'ZAR',
    isProxy:   true,
    timestamp: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  /* ── SARB REST API — multiple series in priority order ──────── */
  // Base URL: https://custom.resbank.co.za/SarbWebApi/WebIndicators/{SeriesCode}/
  // All series are free, public, no authentication.
  // MMRBGBR2035 = R2035 8.875% Dec 2035 (primary target)
  // MMRBGB10Y   = Generic 10-year government benchmark
  // MMRBGBR2030 = R2030 (shorter-dated benchmark)
  const SARB_SERIES = ['MMRBGBR2035', 'MMRBGB10Y', 'MMRBGBR2030'];

  for (const series of SARB_SERIES) {
    try {
      const url = `https://custom.resbank.co.za/SarbWebApi/WebIndicators/${series}/`;
      const res = await get(url);
      if (res.status === 200 && res.json) {
        const bond = parseSARB(res.json, series);
        console.log(`[sarb] ✓ ${series} → ${bond.price}% (${bond.date})`);
        return ok({ bond, series });
      }
      console.warn(`[sarb] ${series} → HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[sarb] ${series} → ${e.message}`);
    }
  }

  /* ── FRED fallback ───────────────────────────────────────────── */
  // Free key from fred.stlouisfed.org — set FRED_API_KEY in Netlify env vars.
  // Without a key, requests are still allowed but may be rate-limited.
  const FRED_KEY = process.env.FRED_API_KEY || '';
  const keyParam = FRED_KEY ? `&api_key=${FRED_KEY}` : '';

  try {
    const fredUrl =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=IRLTLT01ZAM156N${keyParam}` +
      `&sort_order=desc&limit=5&file_type=json`;
    const res = await get(fredUrl);
    if (res.status === 200 && res.json) {
      const bond = parseFRED(res.json);
      console.log(`[sarb] FRED fallback → ${bond.price}%`);
      return ok({
        bond,
        series: 'FRED_FALLBACK',
        warning: 'SARB API unreachable — using FRED proxy (monthly data). Set FRED_API_KEY env var in Netlify for reliability.',
      });
    }
    console.warn(`[sarb] FRED → HTTP ${res.status}`);
  } catch (e) {
    console.warn(`[sarb] FRED → ${e.message}`);
  }

  return err(
    'Could not fetch R2035 yield from SARB or FRED. ' +
    'Check Netlify function logs. The dashboard will still work without bond data.'
  );
};
