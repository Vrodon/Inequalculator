import { useMemo, useRef } from 'react';
import { area as d3area, curveMonotoneX } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import type { GroupKey } from '../data/groupPresets';
import { groupFill } from '../lib/groupColors';
import { clamp } from '../lib/math';
import { formatPercent } from '../lib/format';
import { GroupLegend } from './primitives/GroupLegend';

const W = 640;
const H = 280;
const M = { top: 16, right: 14, bottom: 26, left: 38 };

// Stacking order, bottom of chart → top.
const STACK: GroupKey[] = ['bottom50', 'middle40', 'next9', 'top1'];

interface BandPoint {
  year: number;
  y0: number;
  y1: number;
}

/**
 * The divergence chart: a 100%-stacked area of the four groups' wealth shares
 * over time, so rising concentration is visible as the top bands thickening.
 * Tap or drag to change the year (the accessible year control is in Controls).
 */
export function DivergenceChart() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { result, selectedYear, setYear, pause, years } = useSimulation();

  const series = result.series;

  const x = useMemo(() => scaleLinear().domain([0, years]).range([M.left, W - M.right]), [years]);
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([H - M.bottom, M.top]), []);

  const bands = useMemo(() => {
    const shareOf = (yr: (typeof series)[number], key: GroupKey) =>
      yr.groups.find((g) => g.key === key)?.share ?? 0;
    return STACK.map((key, ki) => {
      const pts: BandPoint[] = series.map((yr) => {
        let below = 0;
        for (let j = 0; j < ki; j++) below += shareOf(yr, STACK[j]);
        return { year: yr.year, y0: below, y1: below + shareOf(yr, key) };
      });
      const gen = d3area<BandPoint>()
        .x((d) => x(d.year))
        .y0((d) => y(d.y0))
        .y1((d) => y(d.y1))
        .curve(curveMonotoneX);
      return { key, d: gen(pts) ?? '' };
    });
  }, [series, x, y]);

  const idx = Math.min(selectedYear, series.length - 1);
  const shareOfNow = (key: GroupKey) => series[idx].groups.find((g) => g.key === key)?.share ?? 0;
  const top1 = shareOfNow('top1');
  const top10 = top1 + shareOfNow('next9');
  const mx = x(selectedYear);

  const transition = prefersReduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 130, damping: 26 } as const);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const yearFromEvent = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    setYear(clamp(Math.round(x.invert(px)), 0, years));
  };

  const a11y = t('divergence.a11y', {
    years,
    year: selectedYear,
    top1: formatPercent(top1),
    top10: formatPercent(top10),
  });

  return (
    <div className="card p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t('divergence.title')}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-g1" aria-hidden="true" />
            <span className="text-muted">{t('groups.top1')}</span>
            <span className="tnum font-semibold text-text">{formatPercent(top1)}</span>
          </span>
          <span className="text-muted">
            {t('groups.top10')} <span className="tnum font-semibold text-text">{formatPercent(top10)}</span>
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={a11y}
        className="h-auto w-full touch-none select-none"
        style={{ cursor: 'ew-resize' }}
      >
        <title>{a11y}</title>

        {bands.map((b) => (
          <motion.path
            key={b.key}
            initial={false}
            animate={{ d: b.d }}
            transition={transition}
            fill={groupFill(b.key)}
            stroke="rgb(var(--c-surface))"
            strokeWidth={1.25}
          />
        ))}

        {/* 50% reference line */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={y(0.5)}
          y2={y(0.5)}
          stroke="rgb(var(--c-text))"
          strokeOpacity={0.35}
          strokeDasharray="4 5"
          strokeWidth={1}
        />

        {/* y labels */}
        {[0, 0.5, 1].map((v) => (
          <text
            key={v}
            x={M.left - 8}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={12}
            fill="rgb(var(--c-faint))"
            className="tnum"
          >
            {formatPercent(v)}
          </text>
        ))}

        {/* x labels */}
        <text x={x(0)} y={H - 8} textAnchor="start" fontSize={12} fill="rgb(var(--c-faint))" className="tnum">
          0
        </text>
        <text x={x(years)} y={H - 8} textAnchor="end" fontSize={12} fill="rgb(var(--c-faint))" className="tnum">
          {years}
        </text>

        {/* year marker */}
        <motion.line
          initial={false}
          animate={{ x1: mx, x2: mx }}
          transition={transition}
          y1={M.top}
          y2={H - M.bottom}
          stroke="rgb(var(--c-text))"
          strokeWidth={1.5}
        />

        <rect
          x={M.left}
          y={0}
          width={W - M.left - M.right}
          height={H}
          fill="transparent"
          aria-hidden="true"
          style={{ cursor: 'ew-resize' }}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture(e.pointerId);
            pause();
            yearFromEvent(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && yearFromEvent(e.clientX)}
          onPointerUp={(e) => {
            dragging.current = false;
            (e.target as Element).releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => (dragging.current = false)}
        />
      </svg>

      <div className="mt-3">
        <GroupLegend groups={series[idx].groups.map((g) => ({ key: g.key as GroupKey, share: g.share }))} />
      </div>
      <p className="mt-1 text-center text-xs text-faint md:hidden">{t('divergence.scrubHint')}</p>
    </div>
  );
}
