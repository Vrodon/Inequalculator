import { useEffect } from 'react';
import { arc as d3arc } from 'd3-shape';
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { formatMultiple, formatPercent, formatShare } from '../lib/format';
import { groupFill } from '../lib/groupColors';
import { clamp } from '../lib/math';
import type { GroupKey } from '../data/groupPresets';
import { GroupLegend } from './primitives/GroupLegend';

const VIEW = 320;
const CENTER = VIEW / 2;
const MAX_OUTER = 140;
const BASE_R = 58;
// The donut reaches MAX_OUTER at this total-wealth multiple; beyond it the radius
// holds. Set high so the donut keeps visibly growing through 10×, 20×, 50×.
const CAP_MULTIPLE = 80;
const GROWTH_SCALE = (MAX_OUTER - BASE_R) / Math.log(CAP_MULTIPLE);
const INNER_RATIO = 0.6;
const TAU = Math.PI * 2;
const SPRING = { stiffness: 140, damping: 22, mass: 0.8 };

const arcGen = d3arc().cornerRadius(2).padAngle(0.02);

/**
 * One donut slice. It owns springs for its own start/end fraction, so the pie
 * works for any number of groups (no hardcoded slice count).
 */
function Slice({
  startFrac,
  endFrac,
  rMV,
  fill,
  label,
  subLabel,
  showLabel,
  prefersReduced,
}: {
  startFrac: number;
  endFrac: number;
  rMV: MotionValue<number>;
  fill: string;
  label: string;
  subLabel?: string;
  showLabel: boolean;
  prefersReduced: boolean;
}) {
  const sMV = useSpring(startFrac, SPRING);
  const eMV = useSpring(endFrac, SPRING);

  useEffect(() => {
    if (prefersReduced) {
      sMV.jump(startFrac);
      eMV.jump(endFrac);
    } else {
      sMV.set(startFrac);
      eMV.set(endFrac);
    }
  }, [startFrac, endFrac, prefersReduced, sMV, eMV]);

  const inputs = [sMV, eMV, rMV];
  const d = useTransform(inputs, ([s, e, r]: number[]) =>
    arcGen({ innerRadius: r * INNER_RATIO, outerRadius: r, startAngle: TAU * s, endAngle: TAU * e }) ??
    '',
  );
  const centroid = useTransform(inputs, ([s, e, r]: number[]) =>
    arcGen.centroid({ innerRadius: r * INNER_RATIO, outerRadius: r, startAngle: TAU * s, endAngle: TAU * e }),
  );
  const cx = useTransform(centroid, (c) => c[0]);
  const cy = useTransform(centroid, (c) => c[1]);
  // When a sub-label (the ×growth tag) is shown, lift the main share label so
  // the two lines stack neatly around the slice centroid.
  const cyMain = useTransform(cy, (v) => (subLabel ? v - 7 : v));
  const cySub = useTransform(cy, (v) => v + 9);

  return (
    <>
      <motion.path d={d} fill={fill} />
      {showLabel && (
        <>
          <motion.text
            x={cx}
            y={cyMain}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fontWeight={700}
            fill="#fff"
            stroke="rgb(0 0 0 / 0.4)"
            strokeWidth={3}
            paintOrder="stroke"
            className="tnum"
          >
            {label}
          </motion.text>
          {subLabel && (
            <motion.text
              x={cx}
              y={cySub}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={600}
              fill="#fff"
              stroke="rgb(0 0 0 / 0.4)"
              strokeWidth={3}
              paintOrder="stroke"
              className="tnum"
            >
              {subLabel}
            </motion.text>
          )}
        </>
      )}
    </>
  );
}

/**
 * The hero visualization: a donut whose outer radius grows with total wealth on
 * a log scale — so it keeps expanding steadily as the economy compounds to 10×,
 * 20×, 50×, instead of saturating early — split into the wealth groups.
 * Everything morphs with spring physics as the country, sliders, tax or year
 * change.
 */
export function GrowingPie() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { result, stats, selectedYear } = useSimulation();

  const idx = Math.min(selectedYear, result.series.length - 1);
  const point = result.series[idx];
  const groups = stats.groups; // richest first; carries each group's growthMultiple
  const ratio = result.series[0].total > 0 ? point.total / result.series[0].total : 1;
  // Radius grows with log(total): a steady, continuous expansion that keeps going
  // as the economy compounds to large multiples, instead of saturating near 5×.
  const outerTarget = clamp(BASE_R + GROWTH_SCALE * Math.log(ratio), BASE_R, MAX_OUTER);

  const rMV = useSpring(outerTarget, SPRING);
  useEffect(() => {
    if (prefersReduced) rMV.jump(outerTarget);
    else rMV.set(outerTarget);
  }, [outerTarget, prefersReduced, rMV]);

  // Cumulative fractions for each slice, plus each group's growth since year 0.
  let acc = 0;
  const slices = groups.map((g) => {
    const start = acc;
    acc += g.share;
    return { key: g.key as GroupKey, start, end: acc, share: g.share, growthMultiple: g.growthMultiple };
  });

  // The per-group ×growth tags only carry meaning once time has passed (at year
  // 0 every multiple is ×1), so they appear from year 1 onward.
  const showSub = selectedYear > 0;

  const shareByKey = (k: GroupKey) => groups.find((g) => g.key === k)?.share ?? 0;
  const multByKey = (k: GroupKey) => groups.find((g) => g.key === k)?.growthMultiple ?? 1;
  const a11y = t('pie.a11y', {
    year: selectedYear,
    multiple: formatMultiple(stats.economyMultiple),
    top1: formatShare(shareByKey('top1')),
    next9: formatShare(shareByKey('next9')),
    middle40: formatShare(shareByKey('middle40')),
    bottom50: formatShare(shareByKey('bottom50')),
    top1x: formatMultiple(multByKey('top1')),
    next9x: formatMultiple(multByKey('next9')),
    middle40x: formatMultiple(multByKey('middle40')),
    bottom50x: formatMultiple(multByKey('bottom50')),
  });

  return (
    <div className="card flex flex-col items-center p-5">
      <h2 className="mb-1 w-full text-sm font-semibold uppercase tracking-wide text-muted">
        {t('pie.title')}
      </h2>

      <div className="relative w-full max-w-[340px]">
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={a11y} className="h-auto w-full">
          <title>{a11y}</title>
          <g transform={`translate(${CENTER}, ${CENTER})`}>
            <circle
              r={BASE_R}
              fill="none"
              stroke="rgb(var(--c-faint))"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              strokeDasharray="3 5"
            />
            {slices.map((s) => (
              <Slice
                key={s.key}
                startFrac={s.start}
                endFrac={s.end}
                rMV={rMV}
                fill={groupFill(s.key)}
                label={formatPercent(s.share)}
                subLabel={showSub ? formatMultiple(s.growthMultiple) : undefined}
                showLabel={s.share > 0.06}
                prefersReduced={!!prefersReduced}
              />
            ))}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={-1}
              fontSize={23}
              fontWeight={800}
              fill="rgb(var(--c-text))"
              className="tnum"
            >
              {formatMultiple(stats.economyMultiple)}
            </text>
          </g>
        </svg>
      </div>

      <p className={`mt-1 text-center text-sm text-muted ${showSub ? 'mb-1' : 'mb-3'}`}>
        {selectedYear === 0
          ? t('pie.captionStart')
          : t('pie.caption', { multiple: formatMultiple(stats.economyMultiple) })}
      </p>
      {showSub && <p className="mb-3 text-center text-xs text-faint">{t('pie.growthHint')}</p>}

      <GroupLegend
        groups={groups.map((g) => ({
          key: g.key as GroupKey,
          share: g.share,
          growthMultiple: showSub ? g.growthMultiple : undefined,
        }))}
      />
    </div>
  );
}
