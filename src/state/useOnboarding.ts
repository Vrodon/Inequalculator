import { useCallback, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

/** Coach-mark steps, in order. Each points at an element tagged `data-tour`. */
export const ONBOARDING_STEPS = ['country', 'rates', 'year'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * First-visit onboarding state. A localStorage flag ensures the tour is shown
 * only once; it can be replayed on demand via `restart`.
 */
export function useOnboarding() {
  const [done, setDone] = useLocalStorage<boolean>('ineq-onboarded', false);
  const [step, setStep] = useState(0);
  const total = ONBOARDING_STEPS.length;

  const next = useCallback(() => {
    setStep((s) => {
      if (s + 1 >= total) {
        setDone(true);
        return s;
      }
      return s + 1;
    });
  }, [setDone, total]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const skip = useCallback(() => setDone(true), [setDone]);
  const restart = useCallback(() => {
    setStep(0);
    setDone(false);
  }, [setDone]);

  return {
    active: !done,
    step,
    stepId: ONBOARDING_STEPS[step],
    total,
    next,
    back,
    skip,
    restart,
  };
}
