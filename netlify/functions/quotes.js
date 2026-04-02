/**
 * JSE Conflict Watch — Yahoo Finance Proxy
 * Netlify Serverless Function (CommonJS — works on all Netlify runtimes)
 *
 * NO API KEY REQUIRED. Proxies Yahoo Finance to bypass browser CORS.
 *
 * GET /.netlify/functions/quotes?symbols=SOL.JO,GC=F,USDZAR=X
 */

const https = require('https');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};

/* ── tiny fetch helper (no external deps) ─────────────────────────── */
function fetchJSON(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: 'https://finance.yahoo.com/',
        Origin: 'https://finance.yahoo.com',
        ...extraHeaders,
      },
    };

    const req = https.get(url, options, (res) => {
      // follow 301/302
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }

      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new Error(`JSON parse failed — status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(new Error('Yahoo Finance request timed out')); });
  });
}

/* ── response helpers ─────────────────────────────────────────────── */
const ok  = (body)       => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) });
const err = (msg, c=502) => ({ statusCode: c,   headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) });

/* ── normalise one Yahoo Finance quote object ─────────────────────── */
function normalise(q) {
  if (!q || q.regularMarketPrice == null) return null;

  return {
    symbol:    q.symbol,
    name:      q.shortName || q.longName || q.symbol,
    price:     q.regularMarketPrice,
    change:    q.regularMarketChange        ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
    prevClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
    dayHigh:   q.regularMarketDayHigh       ?? null,
    dayLow:    q.regularMarketDayLow        ?? null,
    volume:    q.regularMarketVolume        ?? 0,
    currency:  q.currency                  ?? 'USD',
    marketState: q.marketState             ?? 'CLOSED',
    week52High:  q.fiftyTwoWeekHigh        ?? null,
    week52Low:   q.fiftyTwoWeekLow         ?? null,
    timestamp:   new Date().toISOString(),
  };
}

/* ── main handler ─────────────────────────────────────────────────── */
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const qs      = event.queryStringParameters || {};
  const symbols = (qs.symbols || '').trim();

  if (!symbols) {
    return err('symbols query param required (comma-separated Yahoo Finance tickers)', 400);
  }

  // Validate symbol count — Yahoo handles ~100 at once but keep it reasonable
  const symList = symbols.split(',').filter(Boolean);
  if (symList.length > 120) {
    return err('Too many symbols. Max 120 per request.', 400);
  }

  const fields = [
    'regularMarketPrice',
    'regularMarketChange',
    'regularMarketChangePercent',
    'regularMarketPreviousClose',
    'regularMarketDayHigh',
    'regularMarketDayLow',
    'regularMarketVolume',
    'fiftyTwoWeekHigh',
    'fiftyTwoWeekLow',
    'shortName',
    'longName',
    'currency',
    'marketState',
  ].join(',');

  // Yahoo Finance v7 quote endpoint — free, no auth, supports bulk
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symList.join(','))}` +
    `&fields=${fields}` +
    `&lang=en-US&region=US&corsDomain=finance.yahoo.com`;

  try {
    const raw    = await fetchJSON(url);
    const result = raw?.quoteResponse?.result;

    if (!Array.isArray(result)) {
      const yErr = raw?.quoteResponse?.error;
      return err(yErr?.description || 'No data returned from Yahoo Finance. Market may be closed.');
    }

    const quotes = {};
    for (const q of result) {
      const n = normalise(q);
      if (n) quotes[q.symbol] = n;
    }

    return ok({
      quotes,
      requested: symList.length,
      returned:  Object.keys(quotes).length,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[quotes]', e.message);

    // Graceful fallback message — client will use mock data
    return err(`Yahoo Finance unavailable: ${e.message}. Using cached/mock data.`);
  }
};
