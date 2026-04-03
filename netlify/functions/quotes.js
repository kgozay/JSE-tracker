/**
 * JSE Conflict Watch — Yahoo Finance Bulk Quote Proxy
 * Netlify Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * Fetches all JSE stocks + macro assets in ONE request from Yahoo Finance.
 * Proxies server-side to avoid browser CORS blocks.
 *
 * GET /.netlify/functions/quotes?symbols=SOL.JO,GC=F,USDZAR=X,...
 */

const https = require('https');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=60, s-maxage=60',
};

/* ── HTTP helper with redirect following and timeout ────────────── */
function get(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer':         'https://finance.yahoo.com/',
        'Origin':          'https://finance.yahoo.com',
        ...(extraHeaders || {}),
      },
    };
    const req = https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: body.slice(0, 200) }); }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('Yahoo Finance request timed out after 10s')));
    req.on('error', reject);
  });
}

const ok  = body       => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (msg, c=502) => ({ statusCode: c,   headers: CORS, body: JSON.stringify({ error: msg }) });

function normalise(q) {
  if (!q || q.regularMarketPrice == null) return null;
  return {
    symbol:      q.symbol,
    name:        q.shortName || q.longName || q.symbol,
    price:       q.regularMarketPrice,
    change:      q.regularMarketChange        ?? 0,
    changePct:   q.regularMarketChangePercent ?? 0,
    prevClose:   q.regularMarketPreviousClose ?? q.regularMarketPrice,
    dayHigh:     q.regularMarketDayHigh       ?? null,
    dayLow:      q.regularMarketDayLow        ?? null,
    volume:      q.regularMarketVolume        ?? 0,
    currency:    q.currency                   ?? 'USD',
    marketState: q.marketState                ?? 'CLOSED',
    week52High:  q.fiftyTwoWeekHigh           ?? null,
    week52Low:   q.fiftyTwoWeekLow            ?? null,
    timestamp:   new Date().toISOString(),
  };
}

const FIELDS = [
  'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
  'regularMarketPreviousClose', 'regularMarketDayHigh', 'regularMarketDayLow',
  'regularMarketVolume', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
  'shortName', 'longName', 'currency', 'marketState',
].join(',');

/* Try multiple Yahoo Finance hosts — query1 and query2 are both valid */
const YF_HOSTS = [
  'query2.finance.yahoo.com',
  'query1.finance.yahoo.com',
];

async function fetchYahoo(symbols) {
  const path = `/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${FIELDS}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;

  for (const host of YF_HOSTS) {
    try {
      const url = `https://${host}${path}`;
      console.log(`[quotes] Trying ${host}…`);
      const res = await get(url);

      if (res.status !== 200) {
        console.warn(`[quotes] ${host} returned HTTP ${res.status}`);
        continue;
      }
      if (!res.json) {
        console.warn(`[quotes] ${host} returned non-JSON: ${res.raw}`);
        continue;
      }

      const results = res.json?.quoteResponse?.result;
      if (!Array.isArray(results)) {
        const yErr = res.json?.quoteResponse?.error;
        console.warn(`[quotes] ${host} no results array — ${yErr?.description ?? 'unknown'}`);
        continue;
      }

      return results; // success
    } catch (e) {
      console.warn(`[quotes] ${host} threw: ${e.message}`);
    }
  }
  return null; // all hosts failed
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const qs      = event.queryStringParameters || {};
  const symbols = (qs.symbols || '').trim();

  if (!symbols) return err('symbols query param required', 400);

  const symList = symbols.split(',').filter(Boolean);
  if (symList.length > 120) return err('Max 120 symbols per request', 400);

  try {
    const results = await fetchYahoo(symList.join(','));

    if (!results) {
      return err('Yahoo Finance is currently unavailable on both query1 and query2. JSE may be closed or Yahoo may be blocking requests. Try again in a few minutes.');
    }

    const quotes = {};
    let resolved = 0, empty = 0;
    for (const q of results) {
      const n = normalise(q);
      if (n) { quotes[q.symbol] = n; resolved++; }
      else     empty++;
    }

    console.log(`[quotes] ✓ ${resolved} quotes resolved, ${empty} empty, ${symList.length - results.length} not returned`);

    return ok({
      quotes,
      requested: symList.length,
      returned:  resolved,
      empty,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[quotes] Unhandled error:', e.message);
    return err(`Server error: ${e.message}`);
  }
};
