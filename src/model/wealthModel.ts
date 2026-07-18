/**
 * wealthModel.ts — an N-group wealth-compounding model with a Pareto top tail
 * and flexible wealth taxes (flat-on-group, single threshold, progressive
 * brackets).
 *
 * This is a pure module (no React, no DOM, no side effects) so the math is
 * auditable and unit-tested. It generalizes the two-group model in
 * simulation.ts in two ways:
 *
 *   1. Arbitrary population groups (e.g. top 1% / next 9% / middle 40% /
 *      bottom 50%), each with its own real return. Wealthier groups earning
 *      higher returns is what makes the very top pull away from the merely
 *      rich (Fagereng et al. 2020; Bach, Calvet & Sodini 2020).
 *
 *   2. Wealth taxes that depend on absolute wealth *levels* (e.g. "2% on wealth
 *      above €10M"). Those need real currency amounts and the shape of the top
 *      tail, so the model is anchored to a country's total wealth + household
 *      count, and the top decile is modeled as a Pareto distribution whose index
 *      is calibrated each year from the top-1%-vs-top-10% concentration.
 *
 * All returns are REAL (inflation-adjusted). Like the rest of the app this is a
 * stylized illustration of a mechanism, not a forecast.
 */

import { clamp } from '../lib/math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WealthGroup {
  /** Stable id, e.g. "top1", "next9", "middle40", "bottom50". */
  key: string;
  /** i18n key for the display label. */
  labelKey: string;
  /** Share of the population (households), 0–1. Group popShares sum to 1. */
  popShare: number;
  /** Share of total wealth at year 0, 0–1. Group shares sum to 1. */
  initialWealthShare: number;
  /** Real return for this group, %/yr. */
  realReturn: number;
  /** Optional extra saving/reinvestment added to the return, %/yr. */
  extraSaving?: number;
}

export interface CountryAnchor {
  /** ISO-ish currency code, e.g. "USD". */
  currency: string;
  /** Currency symbol, e.g. "$". */
  currencySymbol: string;
  /** Number of households (the population unit). */
  households: number;
  /** Total private net wealth at year 0, in the currency above. */
  totalWealth: number;
  /** Population fraction modeled as a Pareto tail for threshold taxes (e.g. 0.10). */
  tailPopShare: number;
  /** Fallback Pareto index if it can't be calibrated from the groups. */
  fallbackAlpha: number;
}

export type TaxStyle = 'none' | 'flatOnGroups' | 'marginal';

/** A marginal bracket: `rate` (%/yr) applies to wealth above `threshold` (currency). */
export interface TaxBracket {
  threshold: number;
  rate: number;
}

export interface TaxSpec {
  style: TaxStyle;
  /** flatOnGroups: annual rate (%/yr) on the entire wealth of the taxed groups. */
  rate?: number;
  /** flatOnGroups: which group keys are taxed. */
  taxedGroupKeys?: string[];
  /** marginal: ascending-threshold brackets (a single bracket = a flat threshold tax). */
  brackets?: TaxBracket[];
}

export type RedistributionTarget = 'bottom50' | 'bottom90' | 'all' | 'none';

export interface WealthModelParams {
  years: number;
  groups: WealthGroup[];
  anchor: CountryAnchor;
  tax: TaxSpec;
  redistribution: RedistributionTarget;
}

export interface GroupYearPoint {
  key: string;
  labelKey: string;
  popShare: number;
  /** Group wealth this year (currency). */
  wealth: number;
  /** Share of total wealth this year, 0–1. */
  share: number;
  /** Wealth per household in this group (currency). */
  perHousehold: number;
  /** Tax paid by this group this year (currency). */
  tax: number;
}

export interface YearState {
  year: number;
  /** Total private wealth this year (currency). */
  total: number;
  groups: GroupYearPoint[];
  /** Total wealth-tax revenue collected this year (currency). */
  taxRevenue: number;
  /** Pareto index fitted to the top tail this year. */
  paretoAlpha: number;
  /** Tail scale = wealth at the entry to the top tail this year (currency). */
  paretoWMin: number;
}

export interface WealthModelResult {
  params: WealthModelParams;
  series: YearState[];
  households: number;
}

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Pareto tail
// ---------------------------------------------------------------------------

/**
 * Calibrate a Pareto index α from two nested top shares. If the top `innerPop`
 * fraction holds `innerShare` of wealth and the top `outerPop` fraction holds
 * `outerShare`, then for a Pareto tail innerShare/outerShare = (innerPop/outerPop)^((α−1)/α),
 * which inverts to α = 1 / (1 − β), β = ln(ratioShare)/ln(ratioPop).
 *
 * A smaller α means a fatter tail (more concentration at the very top).
 */
export function calibrateParetoAlpha(
  innerShare: number,
  outerShare: number,
  innerPop: number,
  outerPop: number,
  fallback = 1.5,
): number {
  if (
    innerShare <= 0 ||
    outerShare <= 0 ||
    innerShare >= outerShare ||
    innerPop <= 0 ||
    outerPop <= 0 ||
    innerPop >= outerPop
  ) {
    return fallback;
  }
  const beta = Math.log(innerShare / outerShare) / Math.log(innerPop / outerPop);
  if (!Number.isFinite(beta) || beta >= 1) return fallback;
  return clamp(1 / (1 - beta), 1.05, 4);
}

/**
 * A Pareto tail covering `n0` households with index `alpha` and scale `wMin`
 * (the wealth at the tail's lower edge). Provides the closed-form quantities a
 * threshold/progressive wealth tax needs.
 */
export function makeParetoTail(n0: number, alpha: number, wMin: number) {
  const a = clamp(alpha, 1.05, 6);
  const wm = Math.max(wMin, EPS);

  /** Number of households with wealth ≥ w. */
  const countAbove = (w: number): number =>
    w <= wm ? n0 : n0 * Math.pow(wm / w, a);

  /** Total wealth held by households with wealth ≥ w. */
  const wealthAbove = (w: number): number => {
    if (!Number.isFinite(w)) return 0;
    const x = Math.max(w, wm);
    return (n0 * a) / (a - 1) * Math.pow(wm, a) * Math.pow(x, 1 - a);
  };

  /**
   * Excess wealth above threshold T held by households whose wealth lies in
   * [wLo, wHi): ∫ max(0, min(w, wHi) − max(T, wLo)) — the base for a marginal
   * bracket starting at T, restricted to one group's wealth range.
   */
  const excessInRange = (wLo: number, wHi: number, T: number): number => {
    const lo = Math.max(T, wLo);
    if (lo >= wHi) return 0;
    const count = countAbove(lo) - countAbove(wHi);
    const wealth = wealthAbove(lo) - wealthAbove(wHi);
    return Math.max(0, wealth - T * count);
  };

  return { alpha: a, wMin: wm, countAbove, wealthAbove, excessInRange };
}

// ---------------------------------------------------------------------------
// Helpers for groups
// ---------------------------------------------------------------------------

/** Groups sorted richest → poorest by wealth per household. */
function sortRichestFirst(groups: WealthGroup[]): WealthGroup[] {
  return [...groups].sort(
    (x, y) => y.initialWealthShare / y.popShare - x.initialWealthShare / x.popShare,
  );
}

/** Indices (into a richest-first array) that receive redistributed tax. */
function redistributionIndices(sorted: WealthGroup[], target: RedistributionTarget): number[] {
  if (target === 'none') return [];
  if (target === 'all') return sorted.map((_, i) => i);
  const frac = target === 'bottom50' ? 0.5 : 0.9;
  // Walk from the poorest end.
  const out: number[] = [];
  let cum = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (cum >= frac - EPS) break;
    out.push(i);
    cum += sorted[i].popShare;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The simulation
// ---------------------------------------------------------------------------

/** Run the N-group model. Returns a per-year series in richest-first group order. */
export function runWealthModel(params: WealthModelParams): WealthModelResult {
  const years = Math.max(0, Math.floor(params.years));
  const { anchor, tax, redistribution } = params;
  const groups = sortRichestFirst(params.groups);
  const N = groups.length;
  const households = anchor.households;

  // Current wealth per group (currency).
  const wealth = groups.map((g) => g.initialWealthShare * anchor.totalWealth);

  // Which groups make up the Pareto tail (the richest, up to tailPopShare).
  const tailIdx: number[] = [];
  let cumPop = 0;
  for (let i = 0; i < N; i++) {
    if (cumPop >= anchor.tailPopShare - EPS) break;
    tailIdx.push(i);
    cumPop += groups[i].popShare;
  }
  const tailPop = cumPop || anchor.tailPopShare;

  const redistIdx = redistributionIndices(groups, redistribution);
  const redistPop = redistIdx.reduce((s, i) => s + groups[i].popShare, 0);

  const series: YearState[] = [];

  const record = (year: number, taxRevenue: number, alpha: number, wMin: number) => {
    const total = wealth.reduce((s, w) => s + w, 0);
    const perYearTax = taxThisYear.slice();
    series.push({
      year,
      total,
      taxRevenue,
      paretoAlpha: alpha,
      paretoWMin: wMin,
      groups: groups.map((g, i) => ({
        key: g.key,
        labelKey: g.labelKey,
        popShare: g.popShare,
        wealth: wealth[i],
        share: total > EPS ? wealth[i] / total : 0,
        perHousehold: g.popShare > EPS ? wealth[i] / (g.popShare * households) : 0,
        tax: perYearTax[i] ?? 0,
      })),
    });
  };

  let taxThisYear = new Array(N).fill(0);
  record(0, 0, anchor.fallbackAlpha, 0);

  for (let t = 1; t <= years; t++) {
    // 1) Compound each group at its own real return.
    for (let i = 0; i < N; i++) {
      wealth[i] *= 1 + (groups[i].realReturn + (groups[i].extraSaving ?? 0)) / 100;
    }

    // 2) Fit the Pareto tail to the current top decile (for threshold taxes).
    const total = wealth.reduce((s, w) => s + w, 0);
    const tailWealth = tailIdx.reduce((s, i) => s + wealth[i], 0);
    // Calibrate α from the richest group vs the whole tail.
    const richest = groups[0];
    const alpha = calibrateParetoAlpha(
      total > EPS ? wealth[0] / total : 0,
      total > EPS ? tailWealth / total : 0,
      richest.popShare,
      tailPop,
      anchor.fallbackAlpha,
    );
    const n0 = tailPop * households;
    const meanTail = n0 > EPS ? tailWealth / n0 : 0;
    const wMin = (meanTail * (alpha - 1)) / alpha;
    const tail = makeParetoTail(n0, alpha, wMin);

    // 3) Compute this year's tax per group.
    taxThisYear = new Array(N).fill(0);
    if (tax.style === 'flatOnGroups' && tax.rate && tax.rate > 0) {
      const taxed = new Set(tax.taxedGroupKeys ?? []);
      for (let i = 0; i < N; i++) {
        if (taxed.has(groups[i].key)) taxThisYear[i] = wealth[i] * (tax.rate / 100);
      }
    } else if (tax.style === 'marginal' && tax.brackets && tax.brackets.length > 0) {
      const brackets = [...tax.brackets].sort((x, y) => x.threshold - y.threshold);
      // Wealth boundaries for each tail group, richest first, from cumulative pop.
      const wealthAtCumPop = (c: number) =>
        c <= EPS ? Infinity : wMin * Math.pow(tailPop / c, 1 / alpha);
      let cLo = 0;
      for (const i of tailIdx) {
        const cHi = cLo + groups[i].popShare;
        const wHi = wealthAtCumPop(cLo); // richer edge
        const wLo = wealthAtCumPop(cHi); // poorer edge
        let groupTax = 0;
        for (let b = 0; b < brackets.length; b++) {
          const tk = brackets[b].threshold;
          const tNext = b + 1 < brackets.length ? brackets[b + 1].threshold : Infinity;
          const base = tail.excessInRange(wLo, wHi, tk) - tail.excessInRange(wLo, wHi, tNext);
          groupTax += (brackets[b].rate / 100) * base;
        }
        taxThisYear[i] = Math.min(groupTax, wealth[i]); // never tax more than the group has
        cLo = cHi;
      }
    }

    const taxRevenue = taxThisYear.reduce((s, x) => s + x, 0);

    // 4) Apply tax and redistribute (a pure transfer unless target = 'none').
    for (let i = 0; i < N; i++) wealth[i] -= taxThisYear[i];
    if (taxRevenue > 0 && redistIdx.length > 0 && redistPop > EPS) {
      for (const i of redistIdx) {
        wealth[i] += taxRevenue * (groups[i].popShare / redistPop);
      }
    }

    record(t, taxRevenue, alpha, wMin);
  }

  return { params: { ...params, groups }, series, households };
}

// ---------------------------------------------------------------------------
// Derived statistics
// ---------------------------------------------------------------------------

export interface GroupDerived extends GroupYearPoint {
  /** Growth multiple vs year 0 for this group. */
  growthMultiple: number;
}

export interface WealthDerivedStats {
  economyMultiple: number;
  gini: number;
  groups: GroupDerived[];
  /** Share of total wealth held by the top `tailPopShare` (e.g. top 10%). */
  topTailShare: number;
  /** Share held by the single richest group (e.g. top 1%). */
  topGroupShare: number;
  /** Cumulative tax collected up to and including this year (currency). */
  cumulativeTax: number;
  /** Tax collected this year (currency). */
  taxThisYear: number;
}

/** Between-group Gini (assumes equality within groups; a lower bound on true Gini). */
export function groupedGini(groups: { popShare: number; share: number }[]): number {
  const sorted = [...groups].sort((a, b) => a.share / a.popShare - b.share / b.popShare);
  let cum = 0;
  let g = 0;
  for (const grp of sorted) {
    const sBelow = cum;
    const sIncl = cum + grp.share;
    g += grp.popShare * (sBelow + sIncl);
    cum = sIncl;
  }
  return clamp(1 - g, 0, 1);
}

/** Derive headline statistics at a given year. */
export function deriveWealthStats(result: WealthModelResult, year: number): WealthDerivedStats {
  const { series } = result;
  const idx = clamp(Math.round(year), 0, series.length - 1);
  const now = series[idx];
  const start = series[0];

  const economyMultiple = start.total > EPS ? now.total / start.total : 1;

  const groups: GroupDerived[] = now.groups.map((g, i) => {
    const startWealth = start.groups[i]?.wealth ?? g.wealth;
    return { ...g, growthMultiple: startWealth > EPS ? g.wealth / startWealth : 1 };
  });

  // Tail share = richest groups summing to the tail population fraction.
  const tailPop = result.params.anchor.tailPopShare;
  let cumPop = 0;
  let topTailShare = 0;
  for (const g of now.groups) {
    if (cumPop >= tailPop - EPS) break;
    topTailShare += g.share;
    cumPop += g.popShare;
  }

  const richest = now.groups[0];
  const cumulativeTax = series.slice(0, idx + 1).reduce((s, y) => s + y.taxRevenue, 0);

  return {
    economyMultiple,
    gini: groupedGini(now.groups),
    groups,
    topTailShare,
    topGroupShare: richest.share,
    cumulativeTax,
    taxThisYear: now.taxRevenue,
  };
}

// ---------------------------------------------------------------------------
// Convenience builders
// ---------------------------------------------------------------------------

/**
 * The default "return gradient": higher-wealth groups earn higher real returns.
 * bottom50 earns the economy rate g; the top group earns the asset rate r; the
 * middle groups interpolate. Weights are a modeling assumption consistent with
 * the empirical finding that returns rise with wealth (Fagereng et al. 2020).
 */
export const RETURN_WEIGHTS: Record<string, number> = {
  top1: 1,
  next9: 0.7,
  middle40: 0.35,
  bottom50: 0,
};

/** Assign each group a real return interpolated between g (economy) and r (assets). */
export function assignReturns(groups: WealthGroup[], g: number, r: number): WealthGroup[] {
  return groups.map((grp) => {
    const w = RETURN_WEIGHTS[grp.key] ?? 0;
    return { ...grp, realReturn: g + w * (r - g) };
  });
}
