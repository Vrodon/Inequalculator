import { useId } from 'react';
import clsx from 'clsx';
import type { Source } from '../../data/presets';
import { InfoDot } from './InfoDot';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Called when the user starts interacting (used to pause autoplay). */
  onScrubStart?: () => void;
  formatValue?: (value: number) => string;
  help?: string;
  source?: Source;
  secondarySource?: Source;
  ariaValueText?: string;
  showBubble?: boolean;
  disabled?: boolean;
  className?: string;
  /** Hide the built-in label/value row (used when the caller supplies its own). */
  hideHeader?: boolean;
}

const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * An accessible range slider with a filled track, custom thumb and optional value
 * bubble. A visually-hidden native <input type="range"> sits on top so keyboard
 * and screen-reader behavior come for free; the visuals are plain divs.
 */
export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onScrubStart,
  formatValue,
  help,
  source,
  secondarySource,
  ariaValueText,
  showBubble = false,
  disabled = false,
  className,
  hideHeader = false,
}: RangeSliderProps) {
  const id = useId();
  const pct = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const display = formatValue ? formatValue(value) : String(value);
  // x-position of the thumb's center, accounting for the 22px thumb width.
  const center = `calc(${pct} * (100% - 22px) + 11px)`;

  return (
    <div className={clsx('select-none', className)}>
      {!hideHeader && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-0.5">
            <label htmlFor={id} className="truncate text-sm font-medium text-muted">
              {label}
            </label>
            {(help || source) && (
              <InfoDot
                title={label}
                note={help}
                source={source}
                secondarySource={secondarySource}
                placement="start"
              />
            )}
          </div>
          <span className="tnum shrink-0 text-sm font-semibold text-text">{display}</span>
        </div>
      )}

      <div className={clsx('group relative h-6', disabled && 'opacity-40')}>
        {/* rail */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-line bg-surface-2" />
        {/* fill */}
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
          style={{ width: center }}
        />
        {/* thumb */}
        <div
          className="pointer-events-none absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-accent shadow-md transition-transform group-active:scale-110 group-focus-within:ring-2 group-focus-within:ring-accent group-focus-within:ring-offset-2 group-focus-within:ring-offset-bg"
          style={{ left: center }}
        />
        {/* value bubble (year scrubber) */}
        {showBubble && (
          <div
            className="tnum pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-bg shadow-md"
            style={{ left: center }}
          >
            {display}
          </div>
        )}
        {/* real input, transparent, on top */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={hideHeader ? label : undefined}
          aria-valuetext={ariaValueText ?? display}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={onScrubStart}
          onKeyDown={
            onScrubStart
              ? (e) => {
                  if (MOVE_KEYS.has(e.key)) onScrubStart();
                }
              : undefined
          }
          className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 outline-none disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
