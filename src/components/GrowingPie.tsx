import { useEffect } from 'react';
import { arc as d3arc } from 'd3-shape';
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { formatMultiple, formatPercent } from '../lib/format';
import { groupFill } from '../lib/groupColors';
import { clamp } from '../lib/math';
import type { GroupKey } from '../data/groupPresets';
import { GroupLegend } from './primitives/GroupLegend';

const VIEW = 320;
const CENTER = VIEW / 2;
const MAX_OUTER = 132;
const BASE_R = 58;
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
  showLabel,
  prefersReduced,
}: {
  startFrac: number;
  endFrac: number;
  rMV: MotionValue<number>;
  fill: string;
  label: string;
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

  return (
    <>
      <motion.path d={d} fill={fill} />
      {showLabel && (
        <motion.text
          x={cx}
          y={cy}
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
      )}
    </>
  );
}

/**
 * The hero visualization: a donut whose outer radius is area-proportional to
 * total wealth (radius ∝ √total), split into the wealth groups. Everything
 * morphs with spring physics as the country, sliders, tax or year change.
 */
export function GrowingPie() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { result, stats, selectedYear } = useSimulation();

  const idx = Math.min(selectedYear, result.series.length - 1);
  const point = result.series[idx];
  const groups = point.groups; // richest first
  const ratio = result.series[0].total > 0 ? point.total / result.series[0].total : 1;
  const outerTarget = clamp(BASE_R * Math.sqrt(ratio), BASE_R, MAX_OUTER);

  const rMV = useSpring(outerTarget, SPRING);
  useEffect(() => {
    if (prefersReduced) rMV.jump(outerTarget);
    else rMV.set(outerTarget);
  }, [outerTarget, prefersReduced, rMV]);

  // Cumulative fractions for each slice.
  let acc = 0;
  const slices = groups.map((g) => {
    const start = acc;
    acc += g.share;
    return { key: g.key as GroupKey, start, end: acc, share: g.share };
  });

  const shareByKey = (k: GroupKey) => groups.find((g) => g.key === k)?.share ?? 0;
  const a11y = t('pie.a11y', {
    year: selectedYear,
    multiple: formatMultiple(stats.economyMultiple),
    top1: formatPercent(shareByKey('top1')),
    next9: formatPercent(shareByKey('next9')),
    middle40: formatPercent(shareByKey('middle40')),
    bottom50: formatPercent(shareByKey('bottom50')),
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

      <p className="mb-3 mt-1 text-center text-sm text-muted">
        {selectedYear === 0
          ? t('pie.captionStart')
          : t('pie.caption', { multiple: formatMultiple(stats.economyMultiple) })}
      </p>

      <GroupLegend groups={groups.map((g) => ({ key: g.key as GroupKey, share: g.share }))} />
    </div>
  );
}
