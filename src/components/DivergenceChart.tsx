import { useId, useMemo, useRef } from 'react';
import { area as d3area, line as d3line, curveMonotoneX } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import type { YearPoint } from '../model/simulation';
import { formatPercent } from '../lib/format';

const W = 640;
const H = 280;
const M = { top: 18, right: 16, bottom: 28, left: 38 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The divergence chart: the top group's share of total wealth over time, with a
 * 50% reference line and a marker synced to the year scrubber. Tap or drag on
 * the chart to change the year (the accessible year control lives in Controls).
 */
export function DivergenceChart() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { result, selectedYear, setYear, pause, params } = useSimulation();
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const years = params.years;
  const series = result.series;

  const x = useMemo(() => scaleLinear().domain([0, years]).range([M.left, W - M.right]), [years]);
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([H - M.bottom, M.top]), []);

  const linePath = useMemo(() => {
    const gen = d3line<YearPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.topShare))
      .curve(curveMonotoneX);
    return gen(series) ?? '';
  }, [series, x, y]);

  const areaPath = useMemo(() => {
    const gen = d3area<YearPoint>()
      .x((d) => x(d.year))
      .y0(y(0))
      .y1((d) => y(d.topShare))
      .curve(curveMonotoneX);
    return gen(series) ?? '';
  }, [series, x, y]);

  const idx = Math.min(selectedYear, series.length - 1);
  const markerShare = series[idx].topShare;
  const mx = x(selectedYear);
  const my = y(markerShare);

  const transition = prefersReduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 130, damping: 26 } as const);

  const yearFromEvent = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    const yr = clamp(Math.round(x.invert(px)), 0, years);
    setYear(yr);
  };

  const a11y = t('divergence.a11y', {
    top: params.topPercentile,
    years,
    start: formatPercent(series[0].topShare),
    end: formatPercent(markerShare),
    year: selectedYear,
  });

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t('divergence.title')}
        </h2>
        <span className="tnum text-sm font-semibold text-accent">{formatPercent(markerShare)}</span>
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
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgb(var(--c-line))"
              strokeWidth={1}
              strokeDasharray={v === 0.5 ? '4 5' : undefined}
              strokeOpacity={v === 0.5 ? 1 : 0.5}
            />
            <text
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
          </g>
        ))}

        {/* x labels: 0 and horizon */}
        <text
          x={x(0)}
          y={H - 8}
          textAnchor="start"
          fontSize={12}
          fill="rgb(var(--c-faint))"
          className="tnum"
        >
          {t('divergence.xAxis')} 0
        </text>
        <text
          x={x(years)}
          y={H - 8}
          textAnchor="end"
          fontSize={12}
          fill="rgb(var(--c-faint))"
          className="tnum"
        >
          {years}
        </text>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <motion.path
          initial={false}
          animate={{ d: linePath }}
          transition={transition}
          fill="none"
          stroke="rgb(var(--c-accent))"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* year marker: vertical guide + dot */}
        <motion.line
          initial={false}
          animate={{ x1: mx, x2: mx }}
          transition={transition}
          y1={M.top}
          y2={H - M.bottom}
          stroke="rgb(var(--c-text))"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        <motion.circle
          initial={false}
          animate={{ cx: mx, cy: my }}
          transition={transition}
          r={6}
          fill="rgb(var(--c-accent))"
          stroke="rgb(var(--c-bg))"
          strokeWidth={2.5}
        />

        {/* transparent overlay to capture tap / drag scrubbing */}
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
          onPointerMove={(e) => {
            if (dragging.current) yearFromEvent(e.clientX);
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            (e.target as Element).releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        />
      </svg>
      <p className="mt-1 text-center text-xs text-faint md:hidden">{t('divergence.scrubHint')}</p>
    </div>
  );
}
