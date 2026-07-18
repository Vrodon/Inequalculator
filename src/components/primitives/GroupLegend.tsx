import { useTranslation } from 'react-i18next';
import type { GroupKey } from '../../data/groupPresets';
import { GROUP_BG_CLASS } from '../../lib/groupColors';
import { formatMultiple, formatPercent } from '../../lib/format';

/**
 * A compact legend for the four wealth groups. Always shows each group's current
 * share of total wealth; when a `growthMultiple` is supplied it also shows that
 * group's absolute growth since year 0 (e.g. "49% · ×12.4"), so the relative and
 * absolute numbers sit together. Callers that only care about shares (the
 * divergence chart) simply omit `growthMultiple`.
 */
export function GroupLegend({
  groups,
}: {
  groups: { key: GroupKey; share: number; growthMultiple?: number }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
      {groups.map((g) => (
        <div key={g.key} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${GROUP_BG_CLASS[g.key]}`} aria-hidden="true" />
          <span className="text-muted">{t(`groups.${g.key}`)}</span>
          <span className="tnum font-semibold text-text">{formatPercent(g.share)}</span>
          {g.growthMultiple !== undefined && (
            <span className="tnum text-muted">· {formatMultiple(g.growthMultiple)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
