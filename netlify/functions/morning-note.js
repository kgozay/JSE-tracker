/**
 * JSE Conflict Watch — AI Morning Note Generator
 * Netlify Serverless Function — CommonJS
 *
 * Accepts POST with { assets, sectors, cis, stocks } as JSON body.
 * Calls the Anthropic API (claude-haiku-4-5) to generate a real analyst note.
 * Requires ANTHROPIC_API_KEY environment variable set in Netlify.
 *
 * POST /.netlify/functions/morning-note
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
};

const ok  = function(body)   { return { statusCode: 200, headers: CORS, body: JSON.stringify(body) }; };
const err = function(msg, c) { return { statusCode: c || 500, headers: CORS, body: JSON.stringify({ error: msg }) }; };

/* ── HTTPS POST helper with gzip decompression ───────────────────── */
function post(hostname, path, headers, body) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(body);
    const options = {
      hostname: hostname,
      path:     path,
      method:   'POST',
      headers:  Object.assign({
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }, headers),
    };

    const req = https.request(options, function(res) {
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const text = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: text.slice(0, 500) }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(30000, function() { req.destroy(new Error('Anthropic API request timed out (30s)')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ── Format numbers for the prompt ──────────────────────────────── */
function fmt(val, decimals, prefix, suffix) {
  if (val == null) return 'unavailable';
  const sign = val >= 0 ? '+' : '';
  return (prefix || '') + val.toFixed(decimals) + (suffix || '');
}
function pct(val) {
  if (val == null) return 'unavailable';
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

/* ── Build the structured market data prompt ─────────────────────── */
function buildPrompt(assets, sectors, cis, stocks) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' });

  const b = assets.brent     || {};
  const g = assets.gold      || {};
  const u = assets.usdZar    || {};
  const r = assets.r2035     || {};
  const pt = assets.platinum || {};
  const c  = assets.coal     || {};

  const top40  = sectors.top40          || {};
  const miners = sectors['Gold Miners'] || {};
  const pgms   = sectors.PGMs          || {};
  const energy = sectors.Energy        || {};
  const banks  = sectors.Banks         || {};
  const retail = sectors.Retailers     || {};
  const ind    = sectors.Industrials   || {};

  /* Top movers */
  const liveStocks = (stocks || []).filter(function(s) { return s.isLive && s.changePct != null; });
  const topGainers = liveStocks.slice().sort(function(a, b) { return b.changePct - a.changePct; }).slice(0, 3);
  const topLosers  = liveStocks.slice().sort(function(a, b) { return a.changePct - b.changePct; }).slice(0, 3);

  const moversText = liveStocks.length > 0
    ? `Top gainers: ${topGainers.map(function(s) { return s.display + ' (' + pct(s.changePct) + ')'; }).join(', ')}\n` +
      `Top losers:  ${topLosers.map(function(s)  { return s.display + ' (' + pct(s.changePct) + ')'; }).join(', ')}`
    : 'Individual stock data unavailable';

  return `You are a senior South African equity strategist writing the morning market note for JSE Conflict Watch — a dashboard tracking Iran-Middle East geopolitical risk transmission into South African markets.

Write a concise, intelligent morning note of 5–7 short paragraphs. Your audience is institutional investors and sophisticated retail traders on the JSE. Tone: analytical, direct, slightly Bloomberg-terminal style. No bullet points. No fluff. Real insights only.

CURRENT DATE/TIME: ${date} · ${time} SAST
CONFLICT IMPACT SCORE (CIS): ${cis.total ?? '—'} — ${cis.regime ?? 'NO DATA'} (scale: -100 bear to +100 bull)

━━ MACRO DATA ━━
Brent Crude (BZ=F):    ${fmt(b.price, 2, '$', '/bbl')}  ${pct(b.changePct)}
Gold (GC=F):           ${fmt(g.price, 0, '$', '/oz')}    ${pct(g.changePct)}
Platinum (PL=F):       ${fmt(pt.price, 0, '$', '/oz')}   ${pct(pt.changePct)}
USD/ZAR:               R${fmt(u.price, 3)}               ${pct(u.changePct)}
R2035 Bond Yield:      ${fmt(r.price, 3, '', '%')}        ${pct(r.changePct)} [source: ${r.source || 'SARB'}]${r.isStale ? ' — STATIC ESTIMATE' : ''}
Coal Futures (MTF=F):  ${fmt(c.price, 2, '$', '/t')}     ${pct(c.changePct)}

━━ JSE SECTOR PERFORMANCE ━━
Market Average (JSE):  ${pct(top40.chg)}
Gold Miners:           ${pct(miners.chg)}  (rel: ${miners.rel != null ? pct(miners.rel) : '—'})
PGMs:                  ${pct(pgms.chg)}   (rel: ${pgms.rel != null ? pct(pgms.rel) : '—'})
Energy:                ${pct(energy.chg)} (rel: ${energy.rel != null ? pct(energy.rel) : '—'})
Banks:                 ${pct(banks.chg)}  (rel: ${banks.rel != null ? pct(banks.rel) : '—'})
Retailers:             ${pct(retail.chg)} (rel: ${retail.rel != null ? pct(retail.rel) : '—'})
Industrials:           ${pct(ind.chg)}    (rel: ${ind.rel != null ? pct(ind.rel) : '—'})

━━ INDIVIDUAL MOVERS ━━
${moversText}

━━ CIS COMPONENTS ━━
Macro Shock Score (40% weight):     ${cis.components?.macro?.score?.toFixed(1) ?? '—'}
JSE Reaction Score (35% weight):    ${cis.components?.jse?.score?.toFixed(1) ?? '—'}
Confirmation Score (25% weight):    ${cis.components?.conf?.score?.toFixed(1) ?? '—'}

Key themes to address in your note:
1. Oil price transmission into JSE via Sasol, energy sector, and ZAR
2. ZAR move vs. gold hedge — are miners compensating for EM risk-off?
3. Bond yield direction and what it means for bank sector valuations
4. Which sector is the best hedge or most exposed today?
5. One specific trading implication or risk to watch

End the note with: "— JSE Conflict Watch · ${date}"`;
}

/* ── Handler ──────────────────────────────────────────────────────── */
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return err('POST required', 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return err(
      'ANTHROPIC_API_KEY environment variable not set. ' +
      'Add it in Netlify → Site settings → Environment variables.',
      503
    );
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return err('Invalid JSON body', 400);
  }

  const { assets, sectors, cis, stocks } = payload;
  if (!assets || !sectors || !cis) return err('Missing assets, sectors, or cis in request body', 400);

  const prompt = buildPrompt(assets, sectors, cis, stocks || []);
  console.log('[morning-note] Calling Anthropic API…');

  try {
    const res = await post(
      'api.anthropic.com',
      '/v1/messages',
      {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      {
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [
          { role: 'user', content: prompt },
        ],
      }
    );

    if (res.status !== 200) {
      const detail = res.json?.error?.message || res.raw || 'Unknown Anthropic error';
      console.error('[morning-note] Anthropic error', res.status, detail);
      return err('Anthropic API error (' + res.status + '): ' + detail, 502);
    }

    const text = res.json?.content?.[0]?.text;
    if (!text) {
      console.error('[morning-note] Anthropic returned empty content:', JSON.stringify(res.json).slice(0, 300));
      return err('Anthropic returned empty response', 502);
    }

    const usage = res.json.usage || {};
    console.log('[morning-note] ✓ Generated', text.length, 'chars — tokens in:', usage.input_tokens, 'out:', usage.output_tokens);

    return ok({
      note:      text,
      model:     res.json.model,
      tokens_in: usage.input_tokens,
      tokens_out: usage.output_tokens,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[morning-note] Unhandled error:', e.message);
    return err('Server error: ' + e.message);
  }
};
