import { useCallback, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

/** Coach-mark steps, in order. Each points at an element tagged `data-tour`. */
export const ONBOARDING_STEPS = ['country', 'rates', 'year', 'gini', 'tax'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * First-visit onboarding. A welcome modal first explains why the site exists and
 * offers a short tour; the tour then spotlights each tagged area in turn. A
 * localStorage flag ensures the whole thing shows only once; `restart` replays
 * it from the welcome modal.
 */
export function useOnboarding() {
  const [done, setDone] = useLocalStorage<boolean>('ineq-onboarded', false);
  const [stage, setStage] = useState<'welcome' | 'tour'>('welcome');
  const [step, setStep] = useState(0);
  const total = ONBOARDING_STEPS.length;

  const startTour = useCallback(() => {
    setStage('tour');
    setStep(0);
  }, []);
  const dismiss = useCallback(() => setDone(true), [setDone]);

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
    setStage('welcome');
    setDone(false);
  }, [setDone]);

  return {
    showWelcome: !done && stage === 'welcome',
    showTour: !done && stage === 'tour',
    step,
    stepId: ONBOARDING_STEPS[step],
    total,
    startTour,
    dismiss,
    next,
    back,
    skip,
    restart,
  };
}
