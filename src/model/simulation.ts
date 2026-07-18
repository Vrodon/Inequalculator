/**
 * simulation.ts — the pure, auditable core of Inequalculator.
 *
 * This module contains NO React, NO DOM access and NO side effects. Everything
 * here is deterministic math so it can be unit-tested in isolation and so the
 * assumptions are easy to read and check. The UI is a thin layer on top.
 *
 * The model is a deliberately *stylized* two-group compounding model. It splits
 * the population into a "top" group (the top X%, default 10%) and "everyone
 * else", and compounds each group's wealth forward year by year. All returns
 * are REAL (inflation-adjusted). It illustrates one mechanism — Thomas
 * Piketty's r > g, where the return on assets outpaces the growth of the
 * overall economy — and is explicitly not a forecast of any country's future.
 */

/** Inputs to a single simulation run. All rates are percentages per year. */
export interface SimulationParams {
  /** Number of years to project (the model records year 0 … years). */
  years: number;
  /** The top group as a percentage of the population, e.g. 10 for the top 10%. */
  topPercentile: number;
  /** The top group's starting share of total wealth, as a percentage (0–100). */
  topInitialWealthShare: number;
  /** r — the top group's real return on assets, %/yr. */
  assetReturn: number;
  /** g — the bottom group's growth (a proxy for the wider economy), %/yr. */
  economyGrowth: number;
  /** s — extra saving/reinvestment added to the top group's growth, %/yr. */
  extraSaving: number;
  /** An annual wealth tax on the top group, redistributed to the rest, %/yr. */
  wealthTax: number;
}

/** A single year's snapshot. Wealth values are in normalized units (year-0 total = 1). */
export interface YearPoint {
  /** Year index, 0 … params.years. */
  year: number;
  /** Absolute (normalized) wealth held by the top group. */
  wTop: number;
  /** Absolute (normalized) wealth held by everyone else. */
  wBot: number;
  /** Total wealth in the economy this year (wTop + wBot). */
  total: number;
  /** The top group's share of total wealth, 0–1. */
  topShare: number;
  /** Everyone else's share of total wealth, 0–1. */
  bottomShare: number;
}

/** The result of a run: the parameters, the per-year series and population splits. */
export interface SimulationResult {
  params: SimulationParams;
  /** One entry per year, index 0 = year 0 (the starting state). */
  series: YearPoint[];
  /** The top group as a fraction of population, 0–1. */
  popTop: number;
  /** Everyone else as a fraction of population, 0–1. */
  popBot: number;
}

/** Headline statistics derived at a specific year of a run. */
export interface DerivedStats {
  /** How many times bigger the whole economy is vs year 0 (total_Y / total_0). */
  economyMultiple: number;
  /** How many times the top group's wealth grew vs year 0. */
  topGrowthMultiple: number;
  /** How many times everyone else's wealth grew vs year 0. */
  bottomGrowthMultiple: number;
  /** Wealth per person in the top group ÷ wealth per person in the rest. */
  perCapitaRatio: number;
  /** Gini coefficient for the two-group split at this year, clamped to ≥ 0. */
  gini: number;
  /** The top group's share of total wealth at this year, 0–1 (convenience). */
  topShare: number;
  /** Everyone else's share of total wealth at this year, 0–1 (convenience). */
  bottomShare: number;
}

const EPSILON = 1e-12;

/** Clamp a year to a valid index into a run's series. */
function clampYearIndex(year: number, seriesLength: number): number {
  if (!Number.isFinite(year)) return 0;
  const y = Math.round(year);
  if (y < 0) return 0;
  if (y > seriesLength - 1) return seriesLength - 1;
  return y;
}

/**
 * Run the two-group compounding model.
 *
 * Per-year loop (starting from a total of 1):
 *   wTop *= 1 + r + s
 *   wBot *= 1 + g
 *   if wealthTax > 0: move wealthTax% of the top's wealth to the rest
 *
 * @returns the full year-by-year series plus the population split.
 */
export function runSimulation(params: SimulationParams): SimulationResult {
  const years = Math.max(0, Math.floor(params.years));
  const popTop = params.topPercentile / 100;
  const popBot = 1 - popTop;

  const r = params.assetReturn / 100;
  const g = params.economyGrowth / 100;
  const s = params.extraSaving / 100;
  const tax = params.wealthTax / 100;

  // Year 0: normalize total wealth to 1 and split it by the starting share.
  let wTop = params.topInitialWealthShare / 100;
  let wBot = 1 - wTop;

  const series: YearPoint[] = [];
  const record = (year: number) => {
    const total = wTop + wBot;
    series.push({
      year,
      wTop,
      wBot,
      total,
      topShare: total > EPSILON ? wTop / total : 0,
      bottomShare: total > EPSILON ? wBot / total : 0,
    });
  };

  record(0);
  for (let t = 1; t <= years; t++) {
    wTop *= 1 + r + s;
    wBot *= 1 + g;
    if (tax > 0) {
      const transfer = wTop * tax;
      wTop -= transfer;
      wBot += transfer;
    }
    record(t);
  }

  return { params, series, popTop, popBot };
}

/**
 * Derive the headline statistics at a given year of a completed run.
 * `year` is clamped to the available range.
 */
export function deriveStats(result: SimulationResult, year: number): DerivedStats {
  const { series, popTop, popBot } = result;
  const idx = clampYearIndex(year, series.length);
  const start = series[0];
  const now = series[idx];

  const economyMultiple = start.total > EPSILON ? now.total / start.total : 1;
  const topGrowthMultiple = start.wTop > EPSILON ? now.wTop / start.wTop : 1;
  const bottomGrowthMultiple = start.wBot > EPSILON ? now.wBot / start.wBot : 1;

  // Wealth per person: (top wealth / top population) vs (rest wealth / rest population).
  const topPerCapita = popTop > EPSILON ? now.wTop / popTop : Infinity;
  const botPerCapita = popBot > EPSILON ? now.wBot / popBot : Infinity;
  const perCapitaRatio = botPerCapita > EPSILON ? topPerCapita / botPerCapita : Infinity;

  // Exact Gini for a two-group Lorenz curve (assuming equality within groups):
  //   G = popBot − bottomShare. Clamp to ≥ 0 for numeric safety.
  const gini = Math.max(0, popBot - now.bottomShare);

  return {
    economyMultiple,
    topGrowthMultiple,
    bottomGrowthMultiple,
    perCapitaRatio,
    gini,
    topShare: now.topShare,
    bottomShare: now.bottomShare,
  };
}

/**
 * A "lens" is a self-contained way of looking at the r > g mechanism. The app
 * ships with the wealth-compounding lens below; the housing lens (a planned
 * fast-follow) can implement this same interface — a params type plus a `run`
 * that returns a time series — and slot into the UI without reworking the core.
 */
export interface Lens<TParams, TResult> {
  /** Stable identifier, e.g. "wealth-compounding" or "housing". */
  readonly id: string;
  /** Pure function mapping parameters to a result. */
  run(params: TParams): TResult;
}

/** The default lens: two-group wealth compounding under r > g. */
export const wealthCompoundingLens: Lens<SimulationParams, SimulationResult> = {
  id: 'wealth-compounding',
  run: runSimulation,
};
