import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { REPO_URL } from './config';
import { CountrySwitch } from './components/CountrySwitch';
import { GrowingPie } from './components/GrowingPie';
import { StatCards } from './components/StatCards';
import { Controls } from './components/Controls';
import { DivergenceChart } from './components/DivergenceChart';
import { WhatCouldChange } from './components/WhatCouldChange';
import { AdvancedPanel } from './components/AdvancedPanel';
import { Onboarding } from './components/Onboarding';
import { InfoPanel } from './components/InfoPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { GithubIcon, InfoIcon } from './components/icons';

type InfoTab = 'sources' | 'howToRead';

export function App() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<{ open: boolean; tab: InfoTab }>({ open: false, tab: 'sources' });
  const openInfo = (tab: InfoTab) => setInfo({ open: true, tab });

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
              {t('app.title')}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('app.tagline')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openInfo('sources')}
              aria-label={t('header.openAbout')}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-muted transition hover:text-text"
            >
              <InfoIcon size={18} />
              <span className="hidden sm:inline">{t('header.about')}</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        <p className="mb-5 max-w-2xl text-[15px] leading-relaxed text-muted">{t('app.intro')}</p>

        <div className="mb-4">
          <CountrySwitch />
        </div>

        <main className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <GrowingPie />
            <StatCards />
          </div>
          <div className="space-y-4">
            <Controls />
            <DivergenceChart />
            <WhatCouldChange onOpenCaveats={() => openInfo('howToRead')} />
            <AdvancedPanel />
          </div>
        </main>

        <footer className="mt-10 border-t border-line pt-5">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{t('footer.disclaimer')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <button
              type="button"
              onClick={() => openInfo('sources')}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {t('footer.sources')}
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-muted transition hover:text-text"
            >
              <GithubIcon size={16} />
              {t('footer.code')}
            </a>
          </div>
          <p className="mt-3 text-xs text-faint">{t('footer.builtWith')}</p>
        </footer>
      </div>

      <Onboarding />
      <InfoPanel
        open={info.open}
        onClose={() => setInfo((s) => ({ ...s, open: false }))}
        initialTab={info.tab}
      />
    </div>
  );
}
