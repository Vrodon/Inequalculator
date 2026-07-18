import type { KeyboardEvent } from 'react';

const MOVE = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];

/**
 * Keyboard handler for a custom `role="radiogroup"` or `role="tablist"` built
 * from buttons. Attach to the group container; each child (`role="radio"` or
 * `role="tab"`) should set `tabIndex={active ? 0 : -1}`. Arrow keys move focus
 * to the next/previous option and activate it (via a native click, which fires
 * the child's onClick) — the automatic-activation pattern from the WAI-ARIA APG.
 */
export function handleRovingKeys(e: KeyboardEvent<HTMLElement>) {
  if (!MOVE.includes(e.key)) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(
      '[role="radio"]:not([aria-disabled="true"]), [role="tab"]:not([aria-disabled="true"])',
    ),
  ).filter((el) => el.offsetParent !== null);
  if (items.length === 0) return;

  e.preventDefault();
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = current < 0 ? 0 : (current + 1) % items.length;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      next = current < 0 ? 0 : (current - 1 + items.length) % items.length;
      break;
    case 'Home':
      next = 0;
      break;
    default: // End
      next = items.length - 1;
  }
  items[next].focus();
  items[next].click();
}
