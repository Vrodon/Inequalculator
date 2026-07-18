import { useEffect, useMemo } from 'react';
import { arc as d3arc } from 'd3-shape';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { formatMultiple, formatPercent } from '../lib/format';

const VIEW = 320;
const CENTER = VIEW / 2;
const MAX_OUTER = 132; // largest donut radius that fits the viewBox
const BASE_R = 60; // radius representing the year-0 economy (total = 1)
const INNER_RATIO = 0.62;
const TAU = Math.PI * 2;
const SPRING = { stiffness: 140, damping: 22, mass: 0.8 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The hero visualization: a donut whose outer radius is area-proportional to
 * total wealth (radius ∝ √total), split into the top group and everyone else.
 * A dashed ring marks the size of the economy at year 0. Everything morphs with
 * spring physics as the country, sliders or year change.
 */
export function GrowingPie() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { result, stats, selectedYear, params } = useSimulation();

  const idx = Math.min(selectedYear, result.series.length - 1);
  const point = result.series[idx];
  const topShare = point.topShare;
  const bottomShare = point.bottomShare;
  const outerTarget = clamp(BASE_R * Math.sqrt(point.total), BASE_R, MAX_OUTER);

  const arcGen = useMemo(() => d3arc().cornerRadius(3).padAngle(0.016), []);

  const shareMV = useSpring(topShare, SPRING);
  const rMV = useSpring(outerTarget, SPRING);

  useEffect(() => {
    if (prefersReduced) {
      shareMV.jump(topShare);
      rMV.jump(outerTarget);
    } else {
      shareMV.set(topShare);
      rMV.set(outerTarget);
    }
  }, [topShare, outerTarget, prefersReduced, shareMV, rMV]);

  const topD = useTransform([shareMV, rMV], ([s, r]: number[]) =>
    arcGen({ innerRadius: r * INNER_RATIO, outerRadius: r, startAngle: 0, endAngle: TAU * s }) ?? '',
  );
  const botD = useTransform([shareMV, rMV], ([s, r]: number[]) =>
    arcGen({ innerRadius: r * INNER_RATIO, outerRadius: r, startAngle: TAU * s, endAngle: TAU }) ??
    '',
  );
  const topCentroid = useTransform([shareMV, rMV], ([s, r]: number[]) =>
    arcGen.centroid({ innerRadius: r * INNER_RATIO, outerRadius: r, startAngle: 0, endAngle: TAU * s }),
  );
  const botCentroid = useTransform([shareMV, rMV], ([s, r]: number[]) =>
    arcGen.centroid({
      innerRadius: r * INNER_RATIO,
      outerRadius: r,
      startAngle: TAU * s,
      endAngle: TAU,
    }),
  );
  const topX = useTransform(topCentroid, (c) => c[0]);
  const topY = useTransform(topCentroid, (c) => c[1]);
  const botX = useTransform(botCentroid, (c) => c[0]);
  const botY = useTransform(botCentroid, (c) => c[1]);

  const a11y = t('pie.a11y', {
    year: selectedYear,
    multiple: formatMultiple(stats.economyMultiple),
    top: params.topPercentile,
    topShare: formatPercent(topShare),
    bottomShare: formatPercent(bottomShare),
  });

  return (
    <div className="card flex flex-col items-center p-5">
      <div className="mb-1 flex w-full items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('pie.title')}</h2>
      </div>

      <div className="relative w-full max-w-[340px]">
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={a11y} className="h-auto w-full">
          <title>{a11y}</title>
          <g transform={`translate(${CENTER}, ${CENTER})`}>
            {/* year-0 reference ring */}
            <circle
              r={BASE_R}
              fill="none"
              stroke="rgb(var(--c-faint))"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="3 5"
            />
            <motion.path d={botD} fill="rgb(var(--c-cool))" />
            <motion.path d={topD} fill="rgb(var(--c-accent))" />

            {bottomShare > 0.08 && (
              <motion.text
                x={botX}
                y={botY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={15}
                fontWeight={700}
                fill="rgb(var(--c-bg))"
                className="tnum"
              >
                {formatPercent(bottomShare)}
              </motion.text>
            )}
            {topShare > 0.08 && (
              <motion.text
                x={topX}
                y={topY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={15}
                fontWeight={700}
                fill="rgb(var(--c-bg))"
                className="tnum"
              >
                {formatPercent(topShare)}
              </motion.text>
            )}

            {/* economy multiple, in the hole */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={-2}
              fontSize={24}
              fontWeight={800}
              fill="rgb(var(--c-text))"
              className="tnum"
            >
              {formatMultiple(stats.economyMultiple)}
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-1 text-center text-sm text-muted">
        {selectedYear === 0
          ? t('pie.captionStart')
          : t('pie.caption', { multiple: formatMultiple(stats.economyMultiple) })}
      </p>

      {/* legend */}
      <div className="mt-3 flex w-full items-center justify-center gap-5 text-sm">
        <LegendItem
          color="bg-accent"
          label={t('legend.top', { pct: params.topPercentile })}
          value={formatPercent(topShare)}
        />
        <LegendItem
          color="bg-cool"
          label={t('legend.bottom')}
          value={formatPercent(bottomShare)}
        />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-muted">{label}</span>
      <span className="tnum font-semibold text-text">{value}</span>
    </div>
  );
}
