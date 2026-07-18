import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  assignReturns,
  deriveWealthStats,
  makeParetoTail,
  runWealthModel,
  type RedistributionTarget,
  type TaxSpec,
  type WealthDerivedStats,
  type WealthGroup,
  type WealthModelResult,
} from '../model/wealthModel';
import {
  GROUP_DEFS,
  GROUP_PRESETS,
  progressiveBrackets,
  type GroupCountryPreset,
  type GroupKey,
  type GroupPresetId,
  type TaxType,
} from '../data/groupPresets';
import { clamp } from '../lib/math';

export type View = 'simple' | 'advanced';

interface State {
  country: GroupPresetId; // supplies the currency anchor
  custom: boolean; // whether the core values deviate from the country preset
  assetReturn: number; // r
  economyGrowth: number; // g
  years: number;
  shares: Record<GroupKey, number>; // percent, sums to 100
  taxType: TaxType;
  flatTax: { rate: number; scope: 'top1' | 'top10' };
  thresholdTax: { rate: number; threshold: number };
  progressiveTax: { presetId: string; scale: number };
  redistribution: RedistributionTarget;
  selectedYear: number;
  playing: boolean;
  view: View;
}

type CoreReturnKey = 'assetReturn' | 'economyGrowth';

type Action =
  | { type: 'selectCountry'; id: GroupPresetId }
  | { type: 'markCustom' }
  | { type: 'setReturn'; key: CoreReturnKey; value: number }
  | { type: 'setShare'; key: GroupKey; value: number }
  | { type: 'setYear'; year: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setView'; view: View }
  | { type: 'setTaxType'; taxType: TaxType }
  | { type: 'setFlatTax'; patch: Partial<State['flatTax']> }
  | { type: 'setThresholdTax'; patch: Partial<State['thresholdTax']> }
  | { type: 'setProgressiveTax'; patch: Partial<State['progressiveTax']> }
  | { type: 'setRedistribution'; target: RedistributionTarget }
  | { type: 'reset' };

function sharesFromPreset(id: GroupPresetId): Record<GroupKey, number> {
  const p = GROUP_PRESETS[id];
  return {
    top1: p.groupShares.top1.value * 100,
    next9: p.groupShares.next9.value * 100,
    middle40: p.groupShares.middle40.value * 100,
    bottom50: p.groupShares.bottom50.value * 100,
  };
}

function initialState(): State {
  return {
    country: 'US',
    custom: false,
    assetReturn: GROUP_PRESETS.US.assetReturn.value,
    economyGrowth: GROUP_PRESETS.US.economyGrowth.value,
    years: 50,
    shares: sharesFromPreset('US'),
    taxType: 'none',
    flatTax: { rate: 1, scope: 'top10' },
    thresholdTax: { rate: 2, threshold: 10_000_000 },
    progressiveTax: { presetId: 'warren', scale: 1 },
    redistribution: 'all',
    selectedYear: 50,
    playing: false,
    view: 'simple',
  };
}

/** Set one editable share and keep middle40 as the residual so shares sum to 100. */
function updateShares(
  shares: Record<GroupKey, number>,
  key: GroupKey,
  value: number,
): Record<GroupKey, number> {
  const next = { ...shares };
  if (key === 'middle40') {
    next.middle40 = clamp(value, 0, 100);
    return next;
  }
  const others = (['top1', 'next9', 'bottom50'] as GroupKey[])
    .filter((k) => k !== key)
    .reduce((s, k) => s + next[k], 0);
  next[key] = clamp(value, 0, 100 - others);
  next.middle40 = clamp(100 - next.top1 - next.next9 - next.bottom50, 0, 100);
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'selectCountry': {
      const p = GROUP_PRESETS[action.id];
      return {
        ...state,
        country: action.id,
        custom: false,
        assetReturn: p.assetReturn.value,
        economyGrowth: p.economyGrowth.value,
        shares: sharesFromPreset(action.id),
        selectedYear: clamp(state.selectedYear, 0, state.years),
        playing: false,
      };
    }
    case 'markCustom':
      return state.custom ? state : { ...state, custom: true };
    case 'setReturn':
      return { ...state, [action.key]: action.value, custom: true };
    case 'setShare':
      return { ...state, shares: updateShares(state.shares, action.key, action.value), custom: true };
    case 'setYear': {
      const y = clamp(Math.round(action.year), 0, state.years);
      if (y === state.selectedYear) return state;
      return { ...state, selectedYear: y };
    }
    case 'setPlaying':
      if (state.playing === action.playing) return state;
      return { ...state, playing: action.playing };
    case 'setView':
      return { ...state, view: action.view };
    case 'setTaxType':
      return { ...state, taxType: action.taxType };
    case 'setFlatTax':
      return { ...state, flatTax: { ...state.flatTax, ...action.patch } };
    case 'setThresholdTax':
      return { ...state, thresholdTax: { ...state.thresholdTax, ...action.patch } };
    case 'setProgressiveTax':
      return { ...state, progressiveTax: { ...state.progressiveTax, ...action.patch } };
    case 'setRedistribution':
      return { ...state, redistribution: action.target };
    case 'reset': {
      const p = GROUP_PRESETS[state.country];
      return {
        ...state,
        custom: false,
        assetReturn: p.assetReturn.value,
        economyGrowth: p.economyGrowth.value,
        years: 50,
        shares: sharesFromPreset(state.country),
        taxType: 'none',
        flatTax: { rate: 1, scope: 'top10' },
        thresholdTax: { rate: 2, threshold: 10_000_000 },
        progressiveTax: { presetId: 'warren', scale: 1 },
        redistribution: 'all',
        selectedYear: 50,
        playing: false,
      };
    }
    default:
      return state;
  }
}

function resolveTax(
  taxType: TaxType,
  flatTax: State['flatTax'],
  thresholdTax: State['thresholdTax'],
  progressiveTax: State['progressiveTax'],
): TaxSpec {
  switch (taxType) {
    case 'flat':
      return {
        style: 'flatOnGroups',
        rate: flatTax.rate,
        taxedGroupKeys: flatTax.scope === 'top10' ? ['top1', 'next9'] : ['top1'],
      };
    case 'threshold':
      return {
        style: 'marginal',
        brackets: [{ threshold: thresholdTax.threshold, rate: thresholdTax.rate }],
      };
    case 'progressive':
      return {
        style: 'marginal',
        brackets: progressiveBrackets(progressiveTax.presetId, progressiveTax.scale),
      };
    default:
      return { style: 'none' };
  }
}

interface StoreValue extends State {
  preset: GroupCountryPreset;
  currencySymbol: string;
  presetLabel: GroupPresetId | 'custom';
  result: WealthModelResult;
  stats: WealthDerivedStats;
  startStats: WealthDerivedStats;
  taxSpec: TaxSpec;
  taxActive: boolean;
  householdsTaxed: number;
  selectCountry: (id: GroupPresetId) => void;
  markCustom: () => void;
  setReturn: (key: CoreReturnKey, value: number) => void;
  setShare: (key: GroupKey, value: number) => void;
  setYear: (year: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setView: (view: View) => void;
  setTaxType: (taxType: TaxType) => void;
  setFlatTax: (patch: Partial<State['flatTax']>) => void;
  setThresholdTax: (patch: Partial<State['thresholdTax']>) => void;
  setProgressiveTax: (patch: Partial<State['progressiveTax']>) => void;
  setRedistribution: (target: RedistributionTarget) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);

  const preset = GROUP_PRESETS[state.country];

  const groups = useMemo<WealthGroup[]>(() => {
    const g: WealthGroup[] = GROUP_DEFS.map((d) => ({
      key: d.key,
      labelKey: d.labelKey,
      popShare: d.popShare,
      initialWealthShare: state.shares[d.key] / 100,
      realReturn: 0,
    }));
    return assignReturns(g, state.economyGrowth, state.assetReturn);
  }, [state.shares, state.economyGrowth, state.assetReturn]);

  const tax = useMemo(
    () => resolveTax(state.taxType, state.flatTax, state.thresholdTax, state.progressiveTax),
    [state.taxType, state.flatTax, state.thresholdTax, state.progressiveTax],
  );

  const result = useMemo(
    () =>
      runWealthModel({
        years: state.years,
        groups,
        anchor: preset.anchor,
        tax,
        redistribution: state.redistribution,
      }),
    [state.years, groups, preset, tax, state.redistribution],
  );

  const stats = useMemo(() => deriveWealthStats(result, state.selectedYear), [result, state.selectedYear]);
  const startStats = useMemo(() => deriveWealthStats(result, 0), [result]);

  // Households paying tax at the selected year (above the lowest threshold).
  const householdsTaxed = useMemo(() => {
    const idx = clamp(Math.round(state.selectedYear), 0, result.series.length - 1);
    const now = result.series[idx];
    if (tax.style === 'flatOnGroups') {
      const keys = new Set(tax.taxedGroupKeys ?? []);
      return (
        GROUP_DEFS.filter((d) => keys.has(d.key)).reduce((s, d) => s + d.popShare, 0) *
        result.households
      );
    }
    if (tax.style === 'marginal' && tax.brackets?.length) {
      const t0 = Math.min(...tax.brackets.map((b) => b.threshold));
      const tail = makeParetoTail(
        preset.anchor.tailPopShare * result.households,
        now.paretoAlpha,
        now.paretoWMin,
      );
      return tail.countAbove(t0);
    }
    return 0;
  }, [tax, result, preset, state.selectedYear]);

  // Autoplay: animate the year to the horizon.
  useEffect(() => {
    if (!state.playing) return;
    const total = state.years;
    if (prefersReduced) {
      dispatch({ type: 'setYear', year: total });
      dispatch({ type: 'setPlaying', playing: false });
      return;
    }
    const from = state.selectedYear >= total ? 0 : state.selectedYear;
    const duration = clamp(total * 130, 2600, 6500);
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs == null) startTs = ts;
      const t = clamp((ts - startTs) / duration, 0, 1);
      dispatch({ type: 'setYear', year: from + (total - from) * t });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else dispatch({ type: 'setPlaying', playing: false });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing]);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      preset,
      currencySymbol: preset.anchor.currencySymbol,
      presetLabel: state.custom ? 'custom' : state.country,
      result,
      stats,
      startStats,
      taxSpec: tax,
      taxActive: state.taxType !== 'none',
      householdsTaxed,
      selectCountry: (id) => dispatch({ type: 'selectCountry', id }),
      markCustom: () => dispatch({ type: 'markCustom' }),
      setReturn: (key, value2) => dispatch({ type: 'setReturn', key, value: value2 }),
      setShare: (key, value2) => dispatch({ type: 'setShare', key, value: value2 }),
      setYear: (year) => dispatch({ type: 'setYear', year }),
      play: () => dispatch({ type: 'setPlaying', playing: true }),
      pause: () => dispatch({ type: 'setPlaying', playing: false }),
      togglePlay: () => dispatch({ type: 'setPlaying', playing: !state.playing }),
      setView: (view) => dispatch({ type: 'setView', view }),
      setTaxType: (taxType) => dispatch({ type: 'setTaxType', taxType }),
      setFlatTax: (patch) => dispatch({ type: 'setFlatTax', patch }),
      setThresholdTax: (patch) => dispatch({ type: 'setThresholdTax', patch }),
      setProgressiveTax: (patch) => dispatch({ type: 'setProgressiveTax', patch }),
      setRedistribution: (target) => dispatch({ type: 'setRedistribution', target }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state, preset, tax, result, stats, startStats, householdsTaxed],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider');
  return ctx;
}
