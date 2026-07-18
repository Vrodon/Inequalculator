import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CloseIcon } from '../icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Extra actions shown in the header (right side). */
  headerExtra?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog: a bottom sheet on mobile, a centered card on desktop.
 * Handles a backdrop, Escape, body-scroll lock, focus restoration and a basic
 * focus trap.
 */
export function Dialog({ open, onClose, title, children, headerExtra }: DialogProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const prefersReduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the panel once it's mounted.
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => el.offsetParent !== null);
        if (nodes.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      window.clearTimeout(focusTimer);
      lastFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const panelInitial = prefersReduced
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { y: '100%' };
  const panelAnimate = prefersReduced ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 };
  const panelExit = prefersReduced
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { y: '100%' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-card border border-line bg-surface shadow-sheet outline-none md:max-h-[85vh] md:max-w-2xl md:rounded-card"
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* Grab handle (mobile) */}
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" />
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3 md:pt-4">
              <h2 className="text-lg font-semibold text-text">{title}</h2>
              <div className="flex items-center gap-1">
                {headerExtra}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
