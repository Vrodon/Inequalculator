import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { PIKETTY_SOURCE, type Source } from '../data/presets';
import {
  GROUP_PRESETS,
  PARETO_TAIL_SOURCE,
  RETURNS_GRADIENT_SOURCE,
  TAX_PRESETS,
  type GroupCountryPreset,
  type GroupKey,
} from '../data/groupPresets';
import { formatCountCompact, formatCurrencyCompact, formatPercent, formatRate } from '../lib/format';
import { handleRovingKeys } from '../lib/a11y';
import { Dialog } from './primitives/Dialog';
import { ExternalIcon } from './icons';

type Tab = 'sources' | 'howToRead';

const GROUP_KEYS: GroupKey[] = ['top1', 'next9', 'middle40', 'bottom50'];
const sharePct = (v: number) => formatPercent(v, Number.isInteger(v * 100) ? 0 : 1);

function SourceLink({ source }: { source: Source }) {
  const { t } = useTranslation();
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-accent hover:underline"
    >
      <ExternalIcon size={13} className="mt-0.5 shrink-0 opacity-70" />
      <span>
        {source.label}
        <span className="sr-only"> ({t('common.openInNewTab')})</span>
      </span>
    </a>
  );
}

function Row({
  label,
  value,
  source,
  note,
}: {
  label: string;
  value: string;
  source: Source;
  note?: string;
}) {
  return (
    <div className="border-t border-line py-2.5 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="tnum shrink-0 text-sm font-semibold text-text">{value}</span>
      </div>
      {note && <p className="mt-0.5 text-xs leading-relaxed text-muted">{note}</p>}
      <SourceLink source={source} />
    </div>
  );
}

function CountryBlock({ preset }: { preset: GroupCountryPreset }) {
  const { t } = useTranslation();
  const sym = preset.anchor.currencySymbol;
  return (
    <div className="rounded-control border border-line bg-surface-2/50 p-3">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <span aria-hidden="true">{preset.flag}</span>
        {t(preset.nameKey)}
      </h4>
      {GROUP_KEYS.map((k) => (
        <Row
          key={k}
          label={t(`groups.${k}`)}
          value={sharePct(preset.groupShares[k].value)}
          source={preset.groupShares[k].source}
          note={preset.groupShares[k].note}
        />
      ))}
      <Row
        label={t('controls.assetReturn')}
        value={formatRate(preset.assetReturn.value, 1)}
        source={preset.assetReturn.source}
        note={preset.assetReturn.note}
      />
      <Row
        label={t('controls.economyGrowth')}
        value={formatRate(preset.economyGrowth.value, 1)}
        source={preset.economyGrowth.source}
        note={preset.economyGrowth.note}
      />
      <Row
        label={t('info.anchorLabel')}
        value={t('info.anchorValue', {
          wealth: formatCurrencyCompact(preset.anchor.totalWealth, sym),
          households: formatCountCompact(preset.anchor.households),
        })}
        source={preset.anchorSources.totalWealth}
        note={preset.tailNote}
      />
    </div>
  );
}

/** The "Sources & assumptions" / "How to read this" reference panel. */
export function InfoPanel({
  open,
  onClose,
  initialTab = 'sources',
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const leaveOutKeys = ['twoGroup', 'mobility', 'empirical', 'housing', 'wealthTax'] as const;

  return (
    <Dialog open={open} onClose={onClose} title={t('info.title')}>
      <div
        role="tablist"
        aria-label={t('info.title')}
        onKeyDown={handleRovingKeys}
        className="mb-4 flex gap-1 border-b border-line"
      >
        {(['sources', 'howToRead'] as const).map((id) => (
          <button
            key={id}
            id={`info-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`info-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
              tab === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text',
            )}
          >
            {t(`info.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'sources' ? (
        <div
          role="tabpanel"
          id="info-panel-sources"
          aria-labelledby="info-tab-sources"
          className="space-y-5 pb-2"
        >
          <section>
            <h3 className="mb-1 text-sm font-semibold text-text">{t('info.modelHeading')}</h3>
            <p className="text-sm leading-relaxed text-muted">{t('info.modelBody')}</p>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-semibold text-text">{t('info.rgHeading')}</h3>
            <p className="text-sm leading-relaxed text-muted">{t('info.rgBody')}</p>
            <p className="mt-2 rounded-control bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
              {t('info.realReturnsNote')}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-text">{t('info.assumptionsHeading')}</h3>
            <div className="space-y-3">
              <div className="rounded-control border border-line bg-surface-2/50 p-3">
                <h4 className="text-sm font-semibold text-text">{t('info.returnsHeading')}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t('info.returnsBody')}</p>
                <SourceLink source={RETURNS_GRADIENT_SOURCE} />
              </div>
              <div className="rounded-control border border-line bg-surface-2/50 p-3">
                <h4 className="text-sm font-semibold text-text">{t('info.paretoHeading')}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t('info.paretoBody')}</p>
                <SourceLink source={PARETO_TAIL_SOURCE} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-text">{t('info.sourcesHeading')}</h3>
            <div className="space-y-3">
              <CountryBlock preset={GROUP_PRESETS.US} />
              <CountryBlock preset={GROUP_PRESETS.UK} />
              <CountryBlock preset={GROUP_PRESETS.DE} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-text">{t('info.taxDesignsHeading')}</h3>
            <ul className="space-y-2">
              {TAX_PRESETS.filter((p) => p.id !== 'none').map((p) => (
                <li key={p.id} className="text-sm leading-relaxed">
                  <span className="font-medium text-text">{t(p.nameKey)}</span>
                  <span className="text-muted"> — {t(p.descKey)}</span>
                  {p.source && <SourceLink source={p.source} />}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-text">{t('info.pikettyLabel')}</h3>
            <SourceLink source={PIKETTY_SOURCE} />
          </section>
          <p className="text-xs italic leading-relaxed text-faint">{t('info.disclaimer')}</p>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="info-panel-howToRead"
          aria-labelledby="info-tab-howToRead"
          className="space-y-4 pb-2"
        >
          <h3 className="text-sm font-semibold text-text">{t('info.leavesOutHeading')}</h3>
          <ul className="space-y-2.5">
            {leaveOutKeys.map((k) => (
              <li key={k} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-g3" aria-hidden="true" />
                <span>{t(`info.leavesOut.${k}`)}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-control border border-accent/30 bg-accent/[0.06] px-3 py-2.5 text-sm leading-relaxed text-text">
            {t('info.twoSidedNote')}
          </p>
          <section>
            <h3 className="mb-1 text-sm font-semibold text-text">{t('info.privacyHeading')}</h3>
            <p className="text-sm leading-relaxed text-muted">{t('info.privacyBody')}</p>
          </section>
          <p className="text-xs italic leading-relaxed text-faint">{t('info.disclaimer')}</p>
        </div>
      )}
    </Dialog>
  );
}
