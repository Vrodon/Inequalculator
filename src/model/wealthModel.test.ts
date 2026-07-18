import { describe, it, expect } from 'vitest';
import {
  runWealthModel,
  deriveWealthStats,
  calibrateParetoAlpha,
  makeParetoTail,
  groupedGini,
  assignReturns,
  type WealthGroup,
  type CountryAnchor,
  type WealthModelParams,
  type TaxSpec,
} from './wealthModel';

const anchor: CountryAnchor = {
  currency: 'USD',
  currencySymbol: '$',
  households: 131_000_000,
  totalWealth: 158e12,
  tailPopShare: 0.1,
  fallbackAlpha: 1.5,
};

// US-like groups (top1/next9/middle40/bottom50), shares sum to 1.
const baseGroups: WealthGroup[] = [
  { key: 'top1', labelKey: 'g.top1', popShare: 0.01, initialWealthShare: 0.31, realReturn: 6.5 },
  { key: 'next9', labelKey: 'g.next9', popShare: 0.09, initialWealthShare: 0.36, realReturn: 6.5 },
  { key: 'middle40', labelKey: 'g.middle40', popShare: 0.4, initialWealthShare: 0.305, realReturn: 2 },
  { key: 'bottom50', labelKey: 'g.bottom50', popShare: 0.5, initialWealthShare: 0.025, realReturn: 2 },
];

const makeParams = (over: Partial<WealthModelParams> = {}): WealthModelParams => ({
  years: 40,
  groups: baseGroups,
  anchor,
  tax: { style: 'none' },
  redistribution: 'bottom50',
  ...over,
});

const lastYear = (r: ReturnType<typeof runWealthModel>) => r.series[r.series.length - 1];
const shareOf = (r: ReturnType<typeof runWealthModel>, key: string, yearIdx: number) =>
  r.series[yearIdx].groups.find((g) => g.key === key)!.share;

describe('runWealthModel — structure & anchoring', () => {
  it('anchors year 0 to the total wealth and initial shares', () => {
    const r = runWealthModel(makeParams());
    const y0 = r.series[0];
    expect(y0.total).toBeCloseTo(158e12, 0);
    expect(shareOf(r, 'top1', 0)).toBeCloseTo(0.31, 10);
    expect(shareOf(r, 'bottom50', 0)).toBeCloseTo(0.025, 10);
    // shares sum to 1 every year
    for (const y of r.series) {
      const sum = y.groups.reduce((s, g) => s + g.share, 0);
      expect(sum).toBeCloseTo(1, 8);
    }
  });

  it('records year 0 … years inclusive', () => {
    const r = runWealthModel(makeParams({ years: 30 }));
    expect(r.series).toHaveLength(31);
    expect(r.series[30].year).toBe(30);
  });
});

describe('Pareto calibration & tail', () => {
  it('calibrates α from top-1% vs top-10% shares (US ≈ 1.50)', () => {
    expect(calibrateParetoAlpha(0.31, 0.67, 0.01, 0.1)).toBeCloseTo(1.503, 2);
  });

  it('a smaller inner/outer share ratio (more concentration) gives a fatter tail (smaller α)', () => {
    const fat = calibrateParetoAlpha(0.4, 0.6, 0.01, 0.1); // top1 = 2/3 of top10
    const thin = calibrateParetoAlpha(0.2, 0.6, 0.01, 0.1); // top1 = 1/3 of top10
    expect(fat).toBeLessThan(thin);
  });

  it('wealthAbove(wMin) equals the whole tail; excess identity holds', () => {
    const n0 = 1_000_000;
    const alpha = 1.5;
    const wMin = 1_000_000;
    const tail = makeParetoTail(n0, alpha, wMin);
    const tailWealth = (n0 * alpha) / (alpha - 1) * wMin;
    expect(tail.wealthAbove(wMin)).toBeCloseTo(tailWealth, 2);
    // Excess above T for the full tail = wealthAbove(T) − T·countAbove(T).
    const T = 5_000_000;
    const excess = tail.excessInRange(wMin, Infinity, T);
    expect(excess).toBeCloseTo(tail.wealthAbove(T) - T * tail.countAbove(T), 2);
    // Pareto identity: excess above T = (wealth above T)/α.
    expect(excess).toBeCloseTo(tail.wealthAbove(T) / alpha, 2);
  });
});

describe('differential returns', () => {
  it('keeps shares constant when all returns are equal and there is no tax', () => {
    const equal = baseGroups.map((g) => ({ ...g, realReturn: 4 }));
    const r = runWealthModel(makeParams({ groups: equal }));
    for (const key of ['top1', 'next9', 'middle40', 'bottom50']) {
      expect(shareOf(r, key, r.series.length - 1)).toBeCloseTo(shareOf(r, key, 0), 8);
    }
  });

  it('makes the top 1% pull away from the next 9% when it earns a higher return', () => {
    const groups = assignReturns(baseGroups, 2, 6.5); // top1=6.5 > next9=5.15
    const r = runWealthModel(makeParams({ groups }));
    const ratio0 = shareOf(r, 'top1', 0) / shareOf(r, 'next9', 0);
    const ratioEnd =
      shareOf(r, 'top1', r.series.length - 1) / shareOf(r, 'next9', r.series.length - 1);
    expect(ratioEnd).toBeGreaterThan(ratio0);
  });

  it('assignReturns pins bottom50 to g and top1 to r', () => {
    const groups = assignReturns(baseGroups, 2, 6.5);
    expect(groups.find((g) => g.key === 'bottom50')!.realReturn).toBeCloseTo(2, 10);
    expect(groups.find((g) => g.key === 'top1')!.realReturn).toBeCloseTo(6.5, 10);
    expect(groups.find((g) => g.key === 'next9')!.realReturn).toBeGreaterThan(2);
    expect(groups.find((g) => g.key === 'next9')!.realReturn).toBeLessThan(6.5);
  });
});

describe('flat-on-group tax', () => {
  it('lowers the taxed group’s final share vs no tax', () => {
    const noTax = runWealthModel(makeParams());
    const taxed = runWealthModel(
      makeParams({ tax: { style: 'flatOnGroups', rate: 3, taxedGroupKeys: ['top1', 'next9'] } }),
    );
    const i = noTax.series.length - 1;
    expect(shareOf(taxed, 'top1', i)).toBeLessThan(shareOf(noTax, 'top1', i));
    expect(lastYear(taxed).taxRevenue).toBeGreaterThan(0);
  });
});

describe('marginal / threshold tax', () => {
  it('collects a negligible share when the threshold is above everyone', () => {
    const tax: TaxSpec = { style: 'marginal', brackets: [{ threshold: 1e15, rate: 2 }] };
    const r = runWealthModel(makeParams({ tax }));
    // An unbounded Pareto tail always has a sliver of mass above any finite
    // threshold, but at a $1-quadrillion threshold it is negligible vs the economy.
    expect(lastYear(r).taxRevenue / lastYear(r).total).toBeLessThan(1e-5);
  });

  it('collects more as the threshold falls', () => {
    const high = runWealthModel(
      makeParams({ tax: { style: 'marginal', brackets: [{ threshold: 100e6, rate: 2 }] } }),
    );
    const low = runWealthModel(
      makeParams({ tax: { style: 'marginal', brackets: [{ threshold: 10e6, rate: 2 }] } }),
    );
    expect(lastYear(low).taxRevenue).toBeGreaterThan(lastYear(high).taxRevenue);
  });

  it('progressive brackets raise more than the first bracket alone', () => {
    const flat = runWealthModel(
      makeParams({ tax: { style: 'marginal', brackets: [{ threshold: 50e6, rate: 2 }] } }),
    );
    const progressive = runWealthModel(
      makeParams({
        tax: {
          style: 'marginal',
          brackets: [
            { threshold: 50e6, rate: 2 },
            { threshold: 1e9, rate: 3 },
          ],
        },
      }),
    );
    expect(lastYear(progressive).taxRevenue).toBeGreaterThan(lastYear(flat).taxRevenue);
  });

  it('a threshold tax reduces the top 1% share vs no tax', () => {
    const noTax = runWealthModel(makeParams());
    const taxed = runWealthModel(
      makeParams({ tax: { style: 'marginal', brackets: [{ threshold: 10e6, rate: 2 }] } }),
    );
    const i = noTax.series.length - 1;
    expect(shareOf(taxed, 'top1', i)).toBeLessThan(shareOf(noTax, 'top1', i));
  });
});

describe('redistribution', () => {
  it('is a pure transfer (total conserved) when redistributed to all', () => {
    const noTax = runWealthModel(makeParams({ years: 1 }));
    const taxed = runWealthModel(
      makeParams({
        years: 1,
        redistribution: 'all',
        tax: { style: 'flatOnGroups', rate: 3, taxedGroupKeys: ['top1'] },
      }),
    );
    expect(lastYear(taxed).total).toBeCloseTo(lastYear(noTax).total, 0);
  });

  it('shrinks the private pool when revenue is not redistributed', () => {
    const noTax = runWealthModel(makeParams({ years: 1 }));
    const removed = runWealthModel(
      makeParams({
        years: 1,
        redistribution: 'none',
        tax: { style: 'flatOnGroups', rate: 3, taxedGroupKeys: ['top1'] },
      }),
    );
    expect(lastYear(removed).total).toBeLessThan(lastYear(noTax).total);
    expect(lastYear(noTax).total - lastYear(removed).total).toBeCloseTo(
      lastYear(removed).taxRevenue,
      0,
    );
  });

  it('raises the bottom 50% share when tax is redistributed to them', () => {
    const noTax = runWealthModel(makeParams());
    const taxed = runWealthModel(
      makeParams({
        redistribution: 'bottom50',
        tax: { style: 'marginal', brackets: [{ threshold: 10e6, rate: 2 }] },
      }),
    );
    const i = noTax.series.length - 1;
    expect(shareOf(taxed, 'bottom50', i)).toBeGreaterThan(shareOf(noTax, 'bottom50', i));
  });
});

describe('derived stats', () => {
  it('grouped Gini reduces to popBottom − bottomShare for two groups', () => {
    const g = groupedGini([
      { popShare: 0.9, share: 0.33 },
      { popShare: 0.1, share: 0.67 },
    ]);
    expect(g).toBeCloseTo(0.9 - 0.33, 10);
  });

  it('economyMultiple is 1 at year 0 and grows with positive returns', () => {
    const r = runWealthModel(makeParams({ groups: assignReturns(baseGroups, 2, 6.5) }));
    expect(deriveWealthStats(r, 0).economyMultiple).toBeCloseTo(1, 8);
    expect(deriveWealthStats(r, 40).economyMultiple).toBeGreaterThan(1);
  });

  it('reports top-tail (top 10%) and top-group (top 1%) shares consistently', () => {
    const r = runWealthModel(makeParams());
    const s = deriveWealthStats(r, 0);
    expect(s.topGroupShare).toBeCloseTo(0.31, 6);
    expect(s.topTailShare).toBeCloseTo(0.67, 6); // top1 + next9
  });

  it('computes per-household wealth in currency', () => {
    const r = runWealthModel(makeParams());
    const top1 = deriveWealthStats(r, 0).groups.find((g) => g.key === 'top1')!;
    // 31% of $158T over 1% of 131M households.
    const expected = (0.31 * 158e12) / (0.01 * 131_000_000);
    expect(top1.perHousehold).toBeCloseTo(expected, 0);
  });
});
