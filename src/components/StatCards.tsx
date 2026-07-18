import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSimulation } from '../state/store';
import { CountUp } from './primitives/CountUp';
import {
  formatCountCompact,
  formatCurrencyCompact,
  formatGini,
  formatMultiple,
  formatPercent,
  formatShare,
  formatShareFine,
} from '../lib/format';

const pct0 = (v: number) => formatPercent(v, 0);

/** Animated stat tiles plus the plain-language absolute-vs-relative readout. */
export function StatCards() {
  const { t } = useTranslation();
  const { stats, startStats, selectedYear, taxActive, taxSpec, householdsTaxed, currencySymbol } =
    useSimulation();
  const householdsTaxedSub =
    taxSpec.style === 'flatOnGroups' ? t('stats.householdsTaxedSubFlat') : t('stats.householdsTaxedSub');

  const fmtCurrency = (v: number) => formatCurrencyCompact(v, currencySymbol);

  const bottom50 = stats.groups.find((g) => g.key === 'bottom50');
  const bottom50StartShare = startStats.groups.find((g) => g.key === 'bottom50')?.share ?? 0;

  // Which way the bottom half's share moved decides the story: shrinking (asset
  // return above economy growth), growing (economy above assets), or holding
  // (the two in step). The threshold ignores sub-0.01-point floating-point wobble.
  const shareDelta = (bottom50?.share ?? 0) - bottom50StartShare;
  const regime = shareDelta < -1e-4 ? 'concentrating' : shareDelta > 1e-4 ? 'equalizing' : 'balanced';

  const shareVars = {
    multiple: formatMultiple(stats.economyMultiple),
    bottom50x: formatMultiple(bottom50?.growthMultiple ?? 1),
    top1Start: formatShare(startStats.topGroupShare),
    top1Now: formatShare(stats.topGroupShare),
    bottom50Start: formatShareFine(bottom50StartShare),
    bottom50Now: formatShareFine(bottom50?.share ?? 0),
  };

  const readout =
    selectedYear === 0
      ? t('readout.start', {
          top1: formatShare(startStats.topGroupShare),
          bottom50: formatShareFine(bottom50StartShare),
        })
      : t(regime === 'balanced' ? 'readout.mainBalanced' : 'readout.main', shareVars);

  const note = t(
    regime === 'concentrating'
      ? 'readout.noteConcentrating'
      : regime === 'equalizing'
        ? 'readout.noteEqualizing'
        : 'readout.noteBalanced',
  );

  return (
    <div className="space-y-3">
      <div className="card border-accent/30 bg-accent/[0.06] p-4">
        {selectedYear === 0 ? (
          <p className="text-[15px] font-medium leading-snug text-text">{readout}</p>
        ) : (
          <>
            <p className="text-[15px] font-medium leading-snug text-text">{note}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{readout}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile title={t('stats.top1Share')} sub={t('stats.top1ShareSub')} accent>
          <CountUp value={stats.topGroupShare} format={pct0} />
        </StatTile>
        <StatTile title={t('stats.top10Share')} sub={t('stats.top10ShareSub')}>
          <CountUp value={stats.topTailShare} format={pct0} />
        </StatTile>
        <StatTile title={t('stats.economySize')} sub={t('stats.economySizeSub')}>
          <CountUp value={stats.economyMultiple} format={formatMultiple} />
        </StatTile>
        <StatTile title={t('stats.gini')} sub={t('stats.giniSub')}>
          <CountUp value={stats.gini} format={formatGini} />
        </StatTile>

        {taxActive && (
          <>
            <StatTile title={t('stats.taxRevenue')} sub={t('stats.taxRevenueSub')} tone="cool">
              <CountUp value={stats.cumulativeTax} format={fmtCurrency} />
            </StatTile>
            <StatTile title={t('stats.householdsTaxed')} sub={householdsTaxedSub} tone="cool">
              <CountUp value={householdsTaxed} format={formatCountCompact} />
            </StatTile>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  title,
  sub,
  accent = false,
  tone,
  children,
}: {
  title: string;
  sub: string;
  accent?: boolean;
  tone?: 'cool';
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col justify-between gap-2 p-4">
      <p className="text-xs font-medium leading-tight text-muted">{title}</p>
      <div>
        <div
          className={clsx(
            'tnum text-3xl font-bold leading-none',
            accent ? 'text-g1' : tone === 'cool' ? 'text-g3' : 'text-text',
          )}
        >
          {children}
        </div>
        <p className="mt-1.5 text-xs leading-tight text-faint">{sub}</p>
      </div>
    </div>
  );
}
