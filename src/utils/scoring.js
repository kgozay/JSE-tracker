/**
 * Conflict Impact Score engine
 * Score range: -100 (max bearish) to +100 (max bullish for JSE)
 *
 * Weights:
 *   40% Macro Shock Score   (Brent, USD/ZAR, Gold, 10Y yield)
 *   35% JSE Reaction Score  (Top40, Banks, Retailers, Miners)
 *   25% Confirmation Score  (directional alignment of signals)
 */

function clamp(v, min = -100, max = 100) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute Macro Shock Score (-100 to +100)
 * Bearish = oil spike + ZAR weakness + yields rising
 * Bullish = oil down + ZAR stable + gold surging (de-escalation)
 */
export function computeMacroScore({ brentChg, usdZarChg, goldChg, sa10yChg }) {
  // Brent: rise is bearish for JSE (except energy names)
  const brentImpact = clamp(-brentChg * 8, -40, 40);

  // ZAR: weakness (positive chg = more ZAR per USD) is bearish for JSE
  const zarImpact = clamp(-usdZarChg * 15, -30, 30);

  // Gold: rise is generally bullish for JSE miners — partial offset
  const goldImpact = clamp(goldChg * 5, -20, 20);

  // 10Y yield: rising = tighter conditions = bearish
  const yieldImpact = clamp(-sa10yChg * 40, -15, 15);

  const raw = brentImpact + zarImpact + goldImpact + yieldImpact;
  return clamp(Math.round(raw));
}

/**
 * Compute JSE Reaction Score (-100 to +100)
 * Weighted average of sector reactions, adjusted for direction
 */
export function computeJSEScore({ top40Chg, minersChg, energyChg, banksChg, retailersChg, industrialsChg }) {
  // Each sector weighted by JSE Top 40 composition + conflict relevance
  const weighted =
    (top40Chg      * 25) +   // Broad market
    (minersChg     * 20) +   // Miners = partial positive
    (energyChg     * 10) +   // Energy = positive in oil shock
    (banksChg      * 20) +   // Banks = highly sensitive
    (retailersChg  * 15) +   // Retailers = consumer shock
    (industrialsChg * 10);   // Industrials = mixed

  const raw = weighted / 10;  // scale to ~-100/+100 range
  return clamp(Math.round(raw));
}

/**
 * Compute Confirmation Score (-100 to +100)
 * How many signals are aligned in the same direction?
 */
export function computeConfirmationScore({ brentChg, usdZarChg, goldChg, minersChg, banksChg, retailersChg, top40Chg }) {
  const bearSignals = [
    brentChg > 2,
    usdZarChg > 0.8,
    banksChg < -1,
    retailersChg < -1,
    top40Chg < -0.5,
  ].filter(Boolean).length;

  const bullSignals = [
    goldChg > 1,
    minersChg > 1,
    brentChg < -2,
    usdZarChg < -0.5,
  ].filter(Boolean).length;

  const netSignals = bullSignals - bearSignals;
  return clamp(Math.round(netSignals * 18));
}

/**
 * Master scoring function
 */
export function computeCIS(data) {
  const macroScore = computeMacroScore(data);
  const jseScore   = computeJSEScore(data);
  const confScore  = computeConfirmationScore(data);

  const total = clamp(Math.round(
    macroScore * 0.40 +
    jseScore   * 0.35 +
    confScore  * 0.25
  ));

  let regime, regimeClass;
  if      (total <= -40) { regime = 'BEARISH SHOCK';   regimeClass = 'bear'; }
  else if (total <= -15) { regime = 'MILD BEARISH';    regimeClass = 'warn'; }
  else if (total <=  15) { regime = 'NEUTRAL';         regimeClass = 'neutral'; }
  else if (total <=  40) { regime = 'MILD BULLISH';    regimeClass = 'bull'; }
  else                   { regime = 'BULLISH RELIEF';  regimeClass = 'bull'; }

  return {
    total,
    regime,
    regimeClass,
    components: {
      macro: { score: macroScore, weight: 0.40, contrib: +(macroScore * 0.40).toFixed(1) },
      jse:   { score: jseScore,   weight: 0.35, contrib: +(jseScore   * 0.35).toFixed(1) },
      conf:  { score: confScore,  weight: 0.25, contrib: +(confScore  * 0.25).toFixed(1) },
    },
  };
}
