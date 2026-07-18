import type { SimulationParams } from '../model/simulation';

/**
 * Country presets and their sources.
 *
 * Every headline number carries a `source` (label + link) that surfaces as an
 * info tooltip in the UI, and contested figures carry a `note` describing the
 * range and the reason for the choice. The numbers are deliberately round,
 * illustrative anchors — see the Sources & assumptions panel. All returns are
 * REAL (inflation-adjusted).
 */

export type PresetId = 'US' | 'UK' | 'DE' | 'custom';

export interface Source {
  label: string;
  url: string;
}

/** A numeric value that carries its citation and an optional note about ranges. */
export interface Sourced<T> {
  value: T;
  source: Source;
  note?: string;
}

export interface CountryPreset {
  id: PresetId;
  /** i18n key for the full display name, e.g. presets.US.name */
  nameKey: string;
  /** Short label for the segmented control (e.g. "US"). */
  shortLabel: string;
  /** Emoji flag used as a small visual affordance. */
  flag: string;
  topInitialWealthShare: Sourced<number>;
  assetReturn: Sourced<number>;
  economyGrowth: Sourced<number>;
}

// --- Sources (kept as data; institution names are not translated) -------------

const SRC = {
  fedDFA: {
    label: 'Federal Reserve Distributional Financial Accounts / St. Louis Fed',
    url: 'https://www.stlouisfed.org/open-vault/2025/june/the-state-of-us-household-wealth',
  },
  bea: {
    label: 'U.S. Bureau of Economic Analysis — real GDP',
    url: 'https://www.bea.gov/data/gdp/gross-domestic-product',
  },
  damodaran: {
    label: 'NYU Stern (Damodaran) — historical US equity returns',
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
  },
  onsWealth: {
    label: 'ONS Wealth & Assets Survey (top-adjusted with IFS / WID)',
    url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth',
  },
  obr: {
    label: 'ONS / Office for Budget Responsibility — potential output',
    url: 'https://obr.uk/',
  },
  barclays: {
    label: 'Barclays Equity Gilt Study — UK equities, data since 1899',
    url: 'https://www.barclays.co.uk/smart-investor/investments/planning/equity-gilt-study/',
  },
  bundesbank: {
    label: 'Deutsche Bundesbank — household wealth survey (PHF)',
    url: 'https://www.bundesbank.de',
  },
  wid: {
    label: 'World Inequality Database (WID) — top-adjusted wealth shares',
    url: 'https://wid.world',
  },
  destatis: {
    label: 'Destatis / Deutsche Bundesbank — real GDP trend',
    url: 'https://www.destatis.de/EN/',
  },
  dai: {
    label: 'Deutsches Aktieninstitut — DAX-Renditedreieck (long-run DAX real return)',
    url: 'https://www.dai.de/renditedreieck/',
  },
} satisfies Record<string, Source>;

/** Reference for the underlying idea, cited in the info panel. */
export const PIKETTY_SOURCE: Source = {
  label: 'Thomas Piketty — Capital in the Twenty-First Century',
  url: 'https://www.hup.harvard.edu/books/9780674430006',
};

// --- Presets ------------------------------------------------------------------

export const PRESETS: Record<PresetId, CountryPreset> = {
  US: {
    id: 'US',
    nameKey: 'presets.US.name',
    shortLabel: 'US',
    flag: '🇺🇸',
    topInitialWealthShare: {
      value: 67,
      source: SRC.fedDFA,
      note: 'Fed DFA, Q4 2024: top 10% ≈ 67.2%. For context the top 1% ≈ 31% and the bottom 50% ≈ 2.5%.',
    },
    assetReturn: {
      value: 6.5,
      source: SRC.damodaran,
      note: 'US equities long-run real return ≈ 7%; set slightly below to reflect diversified top-decile portfolios.',
    },
    economyGrowth: {
      value: 2.0,
      source: SRC.bea,
      note: 'Long-run real GDP trend growth.',
    },
  },
  UK: {
    id: 'UK',
    nameKey: 'presets.UK.name',
    shortLabel: 'UK',
    flag: '🇬🇧',
    topInitialWealthShare: {
      value: 50,
      source: SRC.onsWealth,
      note: 'ONS official figure ≈ 43%, adjusted upward (IFS / WID) for under-coverage of the very wealthy. Plausible range ≈ 43–57%.',
    },
    assetReturn: {
      value: 5.5,
      source: SRC.barclays,
      note: 'Anchored to UK equities long-run real return ≈ 5.1% (Barclays Equity Gilt Study).',
    },
    economyGrowth: {
      value: 1.5,
      source: SRC.obr,
      note: 'Recent / potential real GDP growth ≈ 1.5–1.7%.',
    },
  },
  DE: {
    id: 'DE',
    nameKey: 'presets.DE.name',
    shortLabel: 'DE',
    flag: '🇩🇪',
    topInitialWealthShare: {
      value: 60,
      source: SRC.bundesbank,
      note: 'Bundesbank 2023 survey ≈ 54%; WID / academic top-adjusted ≈ 60%. Plausible range ≈ 54–63%. See also WID.',
    },
    assetReturn: {
      value: 5.5,
      source: SRC.dai,
      note: 'DAX total-return long-run real ≈ 5–6%; cross-checked with Piketty’s ≈ 4–5% real return on capital.',
    },
    economyGrowth: {
      value: 1.0,
      source: SRC.destatis,
      note: 'Recent real GDP trend ≈ 0–1%.',
    },
  },
  custom: {
    id: 'custom',
    nameKey: 'presets.custom.name',
    shortLabel: 'Custom',
    flag: '🎛️',
    topInitialWealthShare: {
      value: 67,
      source: SRC.fedDFA,
      note: 'Editable — start from your own assumptions.',
    },
    assetReturn: {
      value: 6.5,
      source: SRC.damodaran,
      note: 'Editable — start from your own assumptions.',
    },
    economyGrowth: {
      value: 2.0,
      source: SRC.bea,
      note: 'Editable — start from your own assumptions.',
    },
  },
};

export const PRESET_ORDER: PresetId[] = ['US', 'UK', 'DE', 'custom'];

/** Extra source shown alongside Germany's wealth share (WID cross-reference). */
export const DE_SECONDARY_SOURCE: Source = SRC.wid;

/** Defaults for parameters that are not part of a country preset. */
export const FIXED_DEFAULTS = {
  years: 40,
  topPercentile: 10,
  extraSaving: 0,
  wealthTax: 0,
} as const;

/** Build a full parameter set from a preset, using the fixed defaults for the rest. */
export function presetToParams(preset: CountryPreset): SimulationParams {
  return {
    ...FIXED_DEFAULTS,
    topInitialWealthShare: preset.topInitialWealthShare.value,
    assetReturn: preset.assetReturn.value,
    economyGrowth: preset.economyGrowth.value,
  };
}

/** The three values that define a country's identity in this model. */
export interface CoreValues {
  topInitialWealthShare: number;
  assetReturn: number;
  economyGrowth: number;
}

/** Whether a set of core values exactly matches a given preset. */
export function matchesPreset(preset: CountryPreset, v: CoreValues): boolean {
  return (
    preset.topInitialWealthShare.value === v.topInitialWealthShare &&
    preset.assetReturn.value === v.assetReturn &&
    preset.economyGrowth.value === v.economyGrowth
  );
}
