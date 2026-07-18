import { describe, it, expect } from 'vitest';
import {
  runSimulation,
  deriveStats,
  wealthCompoundingLens,
  type SimulationParams,
} from './simulation';

/** A sensible baseline (loosely the US preset) used across tests. */
const base: SimulationParams = {
  years: 40,
  topPercentile: 10,
  topInitialWealthShare: 67,
  assetReturn: 6.5,
  economyGrowth: 2.0,
  extraSaving: 0,
  wealthTax: 0,
};

const withParams = (overrides: Partial<SimulationParams>): SimulationParams => ({
  ...base,
  ...overrides,
});

describe('runSimulation — structure', () => {
  it('records year 0 through years inclusive', () => {
    const result = runSimulation(withParams({ years: 40 }));
    expect(result.series).toHaveLength(41);
    expect(result.series[0].year).toBe(0);
    expect(result.series[40].year).toBe(40);
  });

  it('normalizes total wealth to 1 at year 0 and splits by the starting share', () => {
    const result = runSimulation(withParams({ topInitialWealthShare: 67 }));
    const y0 = result.series[0];
    expect(y0.total).toBeCloseTo(1, 12);
    expect(y0.wTop).toBeCloseTo(0.67, 12);
    expect(y0.wBot).toBeCloseTo(0.33, 12);
    expect(y0.topShare).toBeCloseTo(0.67, 12);
    expect(y0.bottomShare).toBeCloseTo(0.33, 12);
  });

  it('derives the population split from the top percentile', () => {
    const result = runSimulation(withParams({ topPercentile: 10 }));
    expect(result.popTop).toBeCloseTo(0.1, 12);
    expect(result.popBot).toBeCloseTo(0.9, 12);
  });
});

describe('runSimulation — the r = g invariant', () => {
  it('keeps topShare constant across all years when r = g, s = 0 and tax = 0', () => {
    const result = runSimulation(
      withParams({ assetReturn: 3, economyGrowth: 3, extraSaving: 0, wealthTax: 0 }),
    );
    const first = result.series[0].topShare;
    for (const point of result.series) {
      expect(point.topShare).toBeCloseTo(first, 10);
    }
  });

  it('grows the whole economy while shares stay fixed when r = g', () => {
    const result = runSimulation(withParams({ assetReturn: 4, economyGrowth: 4, years: 20 }));
    const last = result.series[result.series.length - 1];
    // Everyone is richer …
    expect(last.total).toBeGreaterThan(result.series[0].total);
    // … but the split is unchanged.
    expect(last.topShare).toBeCloseTo(result.series[0].topShare, 10);
  });
});

describe('deriveStats — Gini', () => {
  it('equals popBot − bottomShare for sample inputs', () => {
    const result = runSimulation(base);
    for (const year of [0, 10, 25, 40]) {
      const stats = deriveStats(result, year);
      const point = result.series[year];
      expect(stats.gini).toBeCloseTo(result.popBot - point.bottomShare, 12);
    }
  });

  it('never returns a negative Gini', () => {
    // Degenerate case: bottom group already owns more than its head-count share.
    const result = runSimulation(
      withParams({ topInitialWealthShare: 5, assetReturn: 0, economyGrowth: 8 }),
    );
    const stats = deriveStats(result, result.series.length - 1);
    expect(stats.gini).toBeGreaterThanOrEqual(0);
  });
});

describe('deriveStats — economyMultiple', () => {
  it('is monotonically non-decreasing when r ≥ 0 and g ≥ 0', () => {
    const result = runSimulation(withParams({ assetReturn: 6.5, economyGrowth: 2 }));
    let prev = -Infinity;
    for (let y = 0; y < result.series.length; y++) {
      const m = deriveStats(result, y).economyMultiple;
      expect(m).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = m;
    }
  });

  it('is 1 at year 0 and grows thereafter with positive returns', () => {
    const result = runSimulation(withParams({ assetReturn: 5, economyGrowth: 2 }));
    expect(deriveStats(result, 0).economyMultiple).toBeCloseTo(1, 12);
    expect(deriveStats(result, 40).economyMultiple).toBeGreaterThan(1);
  });
});

describe('deriveStats — levers', () => {
  it('a positive wealth tax lowers the final topShare vs no tax', () => {
    const noTax = runSimulation(withParams({ wealthTax: 0 }));
    const withTax = runSimulation(withParams({ wealthTax: 2 }));
    const lastIdx = noTax.series.length - 1;
    expect(deriveStats(withTax, lastIdx).topShare).toBeLessThan(
      deriveStats(noTax, lastIdx).topShare,
    );
  });

  it('a positive extra saving raises the final topShare vs none', () => {
    const noSaving = runSimulation(withParams({ extraSaving: 0 }));
    const withSaving = runSimulation(withParams({ extraSaving: 2 }));
    const lastIdx = noSaving.series.length - 1;
    expect(deriveStats(withSaving, lastIdx).topShare).toBeGreaterThan(
      deriveStats(noSaving, lastIdx).topShare,
    );
  });

  it('with r > g the top share rises over time', () => {
    const result = runSimulation(withParams({ assetReturn: 6.5, economyGrowth: 2 }));
    const startShare = result.series[0].topShare;
    const endShare = result.series[result.series.length - 1].topShare;
    expect(endShare).toBeGreaterThan(startShare);
  });
});

describe('deriveStats — per-capita ratio', () => {
  it('reflects concentration: top-heavy wealth over a small population', () => {
    const result = runSimulation(base);
    const stats = deriveStats(result, 0);
    // Year 0: (0.67 / 0.10) / (0.33 / 0.90) = 6.7 / 0.3667 ≈ 18.27
    expect(stats.perCapitaRatio).toBeCloseTo(6.7 / (0.33 / 0.9), 6);
  });
});

describe('deriveStats — year clamping', () => {
  it('clamps out-of-range years into the valid series', () => {
    const result = runSimulation(withParams({ years: 30 }));
    expect(deriveStats(result, -5).economyMultiple).toBeCloseTo(1, 12); // clamps to year 0
    const last = deriveStats(result, 999);
    expect(last.economyMultiple).toBeCloseTo(deriveStats(result, 30).economyMultiple, 12);
  });
});

describe('wealthCompoundingLens', () => {
  it('exposes runSimulation behind the Lens interface', () => {
    expect(wealthCompoundingLens.id).toBe('wealth-compounding');
    const viaLens = wealthCompoundingLens.run(base);
    const direct = runSimulation(base);
    expect(viaLens.series).toEqual(direct.series);
  });
});
