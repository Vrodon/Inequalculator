import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { Source } from '../../data/presets';
import { ExternalIcon, InfoIcon } from '../icons';

interface InfoDotProps {
  title?: string;
  note?: string;
  source?: Source;
  secondarySource?: Source;
  /** Which edge the popover aligns to. 'start' opens toward the right. */
  placement?: 'start' | 'end';
  className?: string;
  ariaLabel?: string;
}

function SourceLink({ source }: { source: Source }) {
  const { t } = useTranslation();
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-accent hover:underline"
    >
      <ExternalIcon size={13} className="mt-0.5 shrink-0 opacity-70" />
      <span>
        {source.label}
        <span className="sr-only"> ({t('common.openInNewTab')})</span>
      </span>
    </a>
  );
}

/** A small "info" button that opens a popover with a note and its source link(s). */
export function InfoDot({
  title,
  note,
  source,
  secondarySource,
  placement = 'start',
  className,
  ariaLabel,
}: InfoDotProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className={clsx('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={ariaLabel ?? title ?? t('common.learnMore')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-faint transition hover:bg-surface-2 hover:text-text"
      >
        <InfoIcon size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="note"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={clsx(
              'absolute bottom-full z-50 mb-2 block w-64 max-w-[min(18rem,80vw)] rounded-control border border-line bg-surface-2 p-3 text-left shadow-pop',
              placement === 'end' ? 'right-0' : 'left-0',
            )}
          >
            {title && <span className="mb-1 block text-sm font-semibold text-text">{title}</span>}
            {note && <span className="block text-xs leading-relaxed text-muted">{note}</span>}
            {source && <SourceLink source={source} />}
            {secondarySource && <SourceLink source={secondarySource} />}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
