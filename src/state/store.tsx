import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  deriveStats,
  runSimulation,
  type DerivedStats,
  type SimulationParams,
  type SimulationResult,
} from '../model/simulation';
import { PRESETS, presetToParams, type PresetId } from '../data/presets';

export type View = 'simple' | 'advanced';

/** The three values that define a country preset; editing one switches to Custom. */
const CORE_KEYS = ['topInitialWealthShare', 'assetReturn', 'economyGrowth'] as const;
export type ParamKey = keyof SimulationParams;

interface State {
  presetId: PresetId;
  params: SimulationParams;
  selectedYear: number;
  playing: boolean;
  view: View;
}

type Action =
  | { type: 'selectPreset'; id: PresetId }
  | { type: 'setParam'; key: ParamKey; value: number }
  | { type: 'setYear'; year: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setView'; view: View }
  | { type: 'reset' };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function initialState(): State {
  const params = presetToParams(PRESETS.US);
  return {
    presetId: 'US',
    params,
    selectedYear: params.years, // start at the horizon so the effect is visible
    playing: false,
    view: 'simple',
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'selectPreset': {
      if (action.id === 'custom') {
        // Keep the current core values; just relabel the configuration Custom.
        return { ...state, presetId: 'custom' };
      }
      const preset = PRESETS[action.id];
      const params: SimulationParams = {
        ...state.params,
        topInitialWealthShare: preset.topInitialWealthShare.value,
        assetReturn: preset.assetReturn.value,
        economyGrowth: preset.economyGrowth.value,
      };
      return {
        ...state,
        presetId: action.id,
        params,
        playing: false,
        selectedYear: clamp(state.selectedYear, 0, params.years),
      };
    }
    case 'setParam': {
      const params = { ...state.params, [action.key]: action.value };
      const isCore = (CORE_KEYS as readonly string[]).includes(action.key);
      const presetId = isCore ? 'custom' : state.presetId;
      const selectedYear =
        action.key === 'years' ? clamp(state.selectedYear, 0, action.value) : state.selectedYear;
      return { ...state, params, presetId, selectedYear };
    }
    case 'setYear': {
      const y = clamp(Math.round(action.year), 0, state.params.years);
      if (y === state.selectedYear) return state; // bail out — avoids re-render churn
      return { ...state, selectedYear: y };
    }
    case 'setPlaying':
      if (state.playing === action.playing) return state;
      return { ...state, playing: action.playing };
    case 'setView':
      return { ...state, view: action.view };
    case 'reset': {
      const base = PRESETS[state.presetId] ?? PRESETS.custom;
      const params = presetToParams(base);
      return { ...state, params, selectedYear: params.years, playing: false };
    }
    default:
      return state;
  }
}

interface StoreValue extends State {
  result: SimulationResult;
  stats: DerivedStats;
  startStats: DerivedStats;
  selectPreset: (id: PresetId) => void;
  setParam: (key: ParamKey, value: number) => void;
  setYear: (year: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setView: (view: View) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);

  const result = useMemo(() => runSimulation(state.params), [state.params]);
  const stats = useMemo(() => deriveStats(result, state.selectedYear), [result, state.selectedYear]);
  const startStats = useMemo(() => deriveStats(result, 0), [result]);

  // Autoplay: animate the year from its current position to the horizon.
  useEffect(() => {
    if (!state.playing) return;
    const total = state.params.years;

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
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dispatch({ type: 'setPlaying', playing: false });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally only re-run when playback starts/stops; the start year is
    // captured at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing]);

  const selectPreset = useCallback((id: PresetId) => dispatch({ type: 'selectPreset', id }), []);
  const setParam = useCallback(
    (key: ParamKey, value: number) => dispatch({ type: 'setParam', key, value }),
    [],
  );
  const setYear = useCallback((year: number) => dispatch({ type: 'setYear', year }), []);
  const play = useCallback(() => dispatch({ type: 'setPlaying', playing: true }), []);
  const pause = useCallback(() => dispatch({ type: 'setPlaying', playing: false }), []);
  const togglePlay = useCallback(
    () => dispatch({ type: 'setPlaying', playing: !state.playing }),
    [state.playing],
  );
  const setView = useCallback((view: View) => dispatch({ type: 'setView', view }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      result,
      stats,
      startStats,
      selectPreset,
      setParam,
      setYear,
      play,
      pause,
      togglePlay,
      setView,
      reset,
    }),
    [
      state,
      result,
      stats,
      startStats,
      selectPreset,
      setParam,
      setYear,
      play,
      pause,
      togglePlay,
      setView,
      reset,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider');
  return ctx;
}
