import { Component, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function Fallback() {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the message so keyboard / screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <h1 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-text outline-none">
        {t('error.title')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t('error.body')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110"
      >
        {t('error.reload')}
      </button>
    </div>
  );
}

interface State {
  hasError: boolean;
}

/** Catches render errors anywhere below it and shows a recoverable fallback. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Surface for debugging; there is no backend/telemetry to report to.
    console.error('Inequalculator crashed:', error);
  }

  render() {
    return this.state.hasError ? <Fallback /> : this.props.children;
  }
}
