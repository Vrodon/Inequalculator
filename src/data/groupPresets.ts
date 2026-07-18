import type { Source, Sourced } from './presets';
import {
  assignReturns,
  type CountryAnchor,
  type TaxBracket,
  type TaxSpec,
  type WealthGroup,
  type WealthModelParams,
  type RedistributionTarget,
} from '../model/wealthModel';

/**
 * Data for the multi-group model: how wealth is split across four population
 * groups, the currency anchors needed for threshold taxes, and a catalog of
 * real-world wealth-tax designs. Every figure carries its source. All shares
 * are of total private net wealth; all returns are real.
 *
 * The four groups match how the Fed, WID and national statistics offices report
 * wealth, so the numbers are directly sourceable:
 *   top 1%  ·  next 9% (90–99th pctile)  ·  middle 40% (50–90th)  ·  bottom 50%
 */

export type GroupKey = 'top1' | 'next9' | 'middle40' | 'bottom50';
export type GroupPresetId = 'US' | 'UK' | 'DE';

/** Fixed population definition of the four groups (fractions of households). */
export const GROUP_DEFS: { key: GroupKey; labelKey: string; popShare: number }[] = [
  { key: 'top1', labelKey: 'groups.top1', popShare: 0.01 },
  { key: 'next9', labelKey: 'groups.next9', popShare: 0.09 },
  { key: 'middle40', labelKey: 'groups.middle40', popShare: 0.4 },
  { key: 'bottom50', labelKey: 'groups.bottom50', popShare: 0.5 },
];

// --- Sources ------------------------------------------------------------------

const SRC = {
  fedDFA: {
    label: 'Federal Reserve Distributional Financial Accounts / St. Louis Fed (Q4 2024)',
    url: 'https://www.federalreserve.gov/releases/z1/dataviz/dfa/distribute/table/',
  },
  fedNetWorth: {
    label: 'Federal Reserve — Financial Accounts (household net worth)',
    url: 'https://www.federalreserve.gov/releases/z1/',
  },
  wid: {
    label: 'World Inequality Database (WID) — top-adjusted wealth shares',
    url: 'https://wid.world',
  },
  onsWealth: {
    label: 'ONS Wealth & Assets Survey, Great Britain (2020–2022)',
    url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/totalwealthingreatbritain/april2020tomarch2022',
  },
  bundesbank: {
    label: 'Deutsche Bundesbank — 2023 household wealth survey (PHF) / Distributional Wealth Accounts',
    url: 'https://www.bundesbank.de/en/tasks/topics/bundesbank-study-wealth-in-germany-grows-in-nominal-terms-but-declines-in-real-terms-with-no-change-in-inequality-955716',
  },
  fagereng: {
    label: 'Fagereng, Guiso, Malacrino & Pistaferri (2020), “Heterogeneity and Persistence in Returns to Wealth”, Econometrica',
    url: 'https://onlinelibrary.wiley.com/doi/abs/10.3982/ecta14835',
  },
  ecbTail: {
    label: 'ECB / Vermeulen — estimating the top tail of the wealth distribution (Pareto index)',
    url: 'https://www.ecb.europa.eu/pub/pdf/scpwps/ecbwp1692.pdf',
  },
  census: {
    label: 'U.S. Census Bureau — households',
    url: 'https://www.census.gov/',
  },
  destatis: {
    label: 'Destatis — German households',
    url: 'https://www.destatis.de/EN/',
  },
} satisfies Record<string, Source>;

// --- Country presets ----------------------------------------------------------

export interface GroupCountryPreset {
  id: GroupPresetId;
  nameKey: string;
  flag: string;
  anchor: CountryAnchor;
  anchorSources: { totalWealth: Source; households: Source };
  /** Share of total wealth held by each group at year 0 (0–1). */
  groupShares: Record<GroupKey, Sourced<number>>;
  assetReturn: Sourced<number>;
  economyGrowth: Sourced<number>;
  tailNote?: string;
}

export const GROUP_PRESETS: Record<GroupPresetId, GroupCountryPreset> = {
  US: {
    id: 'US',
    nameKey: 'presets.US.name',
    flag: '🇺🇸',
    anchor: {
      currency: 'USD',
      currencySymbol: '$',
      households: 131_000_000,
      totalWealth: 158e12,
      tailPopShare: 0.1,
      fallbackAlpha: 1.5,
    },
    anchorSources: { totalWealth: SRC.fedNetWorth, households: SRC.census },
    groupShares: {
      top1: { value: 0.31, source: SRC.fedDFA, note: 'Fed DFA, top 1% ≈ 31% (Q4 2024).' },
      next9: { value: 0.36, source: SRC.fedDFA, note: '90–99th percentile ≈ 36% (top 10% ≈ 67% minus top 1%).' },
      middle40: { value: 0.305, source: SRC.fedDFA, note: '50–90th percentile ≈ 30%.' },
      bottom50: { value: 0.025, source: SRC.fedDFA, note: 'Bottom 50% ≈ 2.5%.' },
    },
    assetReturn: {
      value: 6.5,
      source: {
        label: 'NYU Stern (Damodaran) — US equities long-run real return ≈ 7%',
        url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
      },
    },
    economyGrowth: {
      value: 2.0,
      source: {
        label: 'U.S. Bureau of Economic Analysis — real GDP trend',
        url: 'https://www.bea.gov/data/gdp/gross-domestic-product',
      },
    },
  },
  UK: {
    id: 'UK',
    nameKey: 'presets.UK.name',
    flag: '🇬🇧',
    anchor: {
      currency: 'GBP',
      currencySymbol: '£',
      households: 28_000_000,
      totalWealth: 13.6e12,
      tailPopShare: 0.1,
      fallbackAlpha: 1.66,
    },
    anchorSources: { totalWealth: SRC.onsWealth, households: SRC.onsWealth },
    groupShares: {
      top1: {
        value: 0.2,
        source: SRC.wid,
        note: 'Contested: ONS survey ≈ 10–13% (undercounts the very wealthy); WID top-adjusted ≈ 21%.',
      },
      next9: { value: 0.3, source: SRC.onsWealth, note: 'Top 10% ≈ 50% minus top 1%.' },
      middle40: { value: 0.45, source: SRC.onsWealth, note: '50–90th percentile.' },
      bottom50: { value: 0.05, source: SRC.onsWealth, note: 'Bottom 50% ≈ 5% (WID); higher on ONS survey.' },
    },
    assetReturn: {
      value: 5.5,
      source: {
        label: 'Barclays Equity Gilt Study — UK equities real return ≈ 5.1% since 1899',
        url: 'https://www.barclays.co.uk/smart-investor/investments/planning/equity-gilt-study/',
      },
    },
    economyGrowth: {
      value: 1.5,
      source: { label: 'ONS / Office for Budget Responsibility — potential output', url: 'https://obr.uk/' },
    },
    tailNote: 'UK wealth is more evenly held (large pension & housing wealth); survey data undercounts the top.',
  },
  DE: {
    id: 'DE',
    nameKey: 'presets.DE.name',
    flag: '🇩🇪',
    anchor: {
      currency: 'EUR',
      currencySymbol: '€',
      households: 41_900_000,
      totalWealth: 13.6e12,
      tailPopShare: 0.1,
      fallbackAlpha: 1.43,
    },
    anchorSources: { totalWealth: SRC.bundesbank, households: SRC.destatis },
    groupShares: {
      top1: { value: 0.3, source: SRC.wid, note: 'WID / DIW top-adjusted ≈ 29–35%; Bundesbank survey lower.' },
      next9: { value: 0.3, source: SRC.bundesbank, note: 'Top 10% ≈ 60% (WID-adjusted) minus top 1%.' },
      middle40: { value: 0.37, source: SRC.bundesbank, note: '50–90th percentile.' },
      bottom50: { value: 0.03, source: SRC.bundesbank, note: 'Bottom 50% ≈ 3%.' },
    },
    assetReturn: {
      value: 5.5,
      source: {
        label: 'Deutsches Aktieninstitut — DAX real return ≈ 5–6%',
        url: 'https://www.dai.de/renditedreieck/',
      },
    },
    economyGrowth: {
      value: 1.0,
      source: { label: 'Destatis / Bundesbank — real GDP trend', url: 'https://www.destatis.de/EN/' },
    },
    tailNote: 'Germany levied a wealth tax until 1997, when the Constitutional Court suspended it over unequal asset valuation.',
  },
};

/** Source describing the differential-returns assumption (the return gradient). */
export const RETURNS_GRADIENT_SOURCE: Source = SRC.fagereng;
/** Source describing the Pareto top-tail assumption used for threshold taxes. */
export const PARETO_TAIL_SOURCE: Source = SRC.ecbTail;

// --- Building model params from a preset --------------------------------------

/** Build the four groups for a preset, with returns interpolated between g and r. */
export function buildGroups(preset: GroupCountryPreset, g: number, r: number): WealthGroup[] {
  const groups: WealthGroup[] = GROUP_DEFS.map((d) => ({
    key: d.key,
    labelKey: d.labelKey,
    popShare: d.popShare,
    initialWealthShare: preset.groupShares[d.key].value,
    realReturn: 0,
  }));
  return assignReturns(groups, g, r);
}

export interface BuildOptions {
  years?: number;
  assetReturn?: number;
  economyGrowth?: number;
  tax?: TaxSpec;
  redistribution?: RedistributionTarget;
}

/** Assemble a full set of model parameters for a country preset. */
export function buildWealthParams(
  preset: GroupCountryPreset,
  opts: BuildOptions = {},
): WealthModelParams {
  const r = opts.assetReturn ?? preset.assetReturn.value;
  const g = opts.economyGrowth ?? preset.economyGrowth.value;
  return {
    years: opts.years ?? 40,
    groups: buildGroups(preset, g, r),
    anchor: preset.anchor,
    tax: opts.tax ?? { style: 'none' },
    redistribution: opts.redistribution ?? 'bottom50',
  };
}

// --- Wealth-tax design catalog ------------------------------------------------

export type TaxPresetId =
  | 'none'
  | 'flatTop10'
  | 'threshold10m'
  | 'warren'
  | 'zucman'
  | 'spain'
  | 'swiss';

export interface TaxPreset {
  id: TaxPresetId;
  nameKey: string;
  descKey: string;
  /** Build the spec. Thresholds are magnitudes read in the active country's currency. */
  build: () => TaxSpec;
  source?: Source;
}

/**
 * A catalog of wealth-tax styles, modeled on real designs and prominent
 * proposals. Threshold magnitudes are interpreted in the active currency
 * ($/£/€), which are broadly comparable for illustration.
 */
export const TAX_PRESETS: TaxPreset[] = [
  {
    id: 'none',
    nameKey: 'taxPresets.none.name',
    descKey: 'taxPresets.none.desc',
    build: () => ({ style: 'none' }),
  },
  {
    id: 'flatTop10',
    nameKey: 'taxPresets.flatTop10.name',
    descKey: 'taxPresets.flatTop10.desc',
    build: () => ({ style: 'flatOnGroups', rate: 1, taxedGroupKeys: ['top1', 'next9'] }),
    source: {
      label: 'OECD — The Role and Design of Net Wealth Taxes',
      url: 'https://www.oecd.org/en/publications/the-role-and-design-of-net-wealth-taxes-in-the-oecd_9789264290303-en.html',
    },
  },
  {
    id: 'threshold10m',
    nameKey: 'taxPresets.threshold10m.name',
    descKey: 'taxPresets.threshold10m.desc',
    build: () => ({ style: 'marginal', brackets: [{ threshold: 10e6, rate: 2 }] }),
  },
  {
    id: 'warren',
    nameKey: 'taxPresets.warren.name',
    descKey: 'taxPresets.warren.desc',
    build: () => ({
      style: 'marginal',
      brackets: [
        { threshold: 50e6, rate: 2 },
        { threshold: 1e9, rate: 3 },
      ],
    }),
    source: {
      label: 'Warren Ultra-Millionaire Tax Act — 2% above $50M, 3% above $1B',
      url: 'https://www.warren.senate.gov/newsroom/press-releases/warren-jayapal-boyle-reintroduce-ultra-millionaire-tax-on-fortunes-over-50-million/',
    },
  },
  {
    id: 'zucman',
    nameKey: 'taxPresets.zucman.name',
    descKey: 'taxPresets.zucman.desc',
    build: () => ({ style: 'marginal', brackets: [{ threshold: 100e6, rate: 2 }] }),
    source: {
      label: 'Zucman (2024) — G20 blueprint for a 2% minimum tax on ultra-high-net-worth individuals',
      url: 'https://gabriel-zucman.eu/files/report-g20.pdf',
    },
  },
  {
    id: 'spain',
    nameKey: 'taxPresets.spain.name',
    descKey: 'taxPresets.spain.desc',
    build: () => ({
      style: 'marginal',
      brackets: [
        { threshold: 700e3, rate: 0.2 },
        { threshold: 3e6, rate: 1.0 },
        { threshold: 10e6, rate: 2.0 },
        { threshold: 50e6, rate: 3.5 },
      ],
    }),
    source: {
      label: 'Tax Foundation — Wealth Taxes in Europe (Spain: progressive 0.2–3.5% + solidarity tax)',
      url: 'https://taxfoundation.org/data/all/eu/wealth-taxes-europe/',
    },
  },
  {
    id: 'swiss',
    nameKey: 'taxPresets.swiss.name',
    descKey: 'taxPresets.swiss.desc',
    build: () => ({ style: 'marginal', brackets: [{ threshold: 100e3, rate: 0.6 }] }),
    source: {
      label: 'Tax Foundation — Wealth Taxes in Europe (Switzerland: broad, low cantonal net-wealth tax)',
      url: 'https://taxfoundation.org/data/all/eu/wealth-taxes-europe/',
    },
  },
];

// --- Type-organized standards for the wealth-tax picker -----------------------

/**
 * The picker is organized by the kind of tax first. Besides "no tax" there are
 * three families, each with a few real-world "standards" the user can start from
 * and then fine-tune with sliders:
 *   flat        — a flat annual rate on a top group's whole wealth
 *   threshold   — a marginal rate above a single wealth threshold
 *   progressive — rising rates across several bands (the UI scales them together)
 */
export type TaxType = 'none' | 'flat' | 'threshold' | 'progressive';

export interface FlatStandard {
  id: string;
  labelKey: string;
  rate: number;
  scope: 'top1' | 'top10';
}
export interface ThresholdStandard {
  id: string;
  labelKey: string;
  rate: number;
  threshold: number;
}
export interface ProgressiveStandard {
  id: string;
  labelKey: string;
  brackets: TaxBracket[];
}

export const FLAT_STANDARDS: FlatStandard[] = [
  { id: 'flatTop10', labelKey: 'taxStd.flatTop10', rate: 1, scope: 'top10' },
];

export const THRESHOLD_STANDARDS: ThresholdStandard[] = [
  { id: 'threshold10m', labelKey: 'taxStd.threshold10m', rate: 2, threshold: 10e6 },
  { id: 'zucman', labelKey: 'taxStd.zucman', rate: 2, threshold: 100e6 },
  { id: 'swiss', labelKey: 'taxStd.swiss', rate: 0.6, threshold: 100e3 },
];

export const PROGRESSIVE_STANDARDS: ProgressiveStandard[] = [
  {
    id: 'warren',
    labelKey: 'taxStd.warren',
    brackets: [
      { threshold: 50e6, rate: 2 },
      { threshold: 1e9, rate: 3 },
    ],
  },
  {
    id: 'spain',
    labelKey: 'taxStd.spain',
    brackets: [
      { threshold: 700e3, rate: 0.2 },
      { threshold: 3e6, rate: 1.0 },
      { threshold: 10e6, rate: 2.0 },
      { threshold: 50e6, rate: 3.5 },
    ],
  },
];

/** A progressive standard's bands with every rate multiplied by `scale`. */
export function progressiveBrackets(presetId: string, scale: number): TaxBracket[] {
  const std = PROGRESSIVE_STANDARDS.find((s) => s.id === presetId) ?? PROGRESSIVE_STANDARDS[0];
  return std.brackets.map((b) => ({ threshold: b.threshold, rate: b.rate * scale }));
}
