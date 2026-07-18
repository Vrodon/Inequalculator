import type { GroupKey } from '../data/groupPresets';

/** CSS custom property holding each group's color (see styles/index.css). */
export const GROUP_COLOR_VAR: Record<GroupKey, string> = {
  top1: '--c-g1',
  next9: '--c-g2',
  middle40: '--c-g3',
  bottom50: '--c-g4',
};

/** Tailwind background class for each group. */
export const GROUP_BG_CLASS: Record<GroupKey, string> = {
  top1: 'bg-g1',
  next9: 'bg-g2',
  middle40: 'bg-g3',
  bottom50: 'bg-g4',
};

/** An `rgb(var(--…))` fill string for SVG marks. */
export const groupFill = (key: GroupKey): string => `rgb(var(${GROUP_COLOR_VAR[key]}))`;
