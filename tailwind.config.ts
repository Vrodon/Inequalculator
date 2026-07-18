import type { Config } from 'tailwindcss';

/**
 * Colors are driven by CSS custom properties (see src/styles/index.css) so the
 * whole palette swaps between the dark and light themes without `dark:`
 * variants sprinkled through the markup. Each token is stored as three
 * space-separated RGB channels so Tailwind's `<alpha-value>` opacity syntax
 * keeps working (e.g. `bg-accent/20`).
 */
const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: withVar('--c-bg'),
        surface: withVar('--c-surface'),
        'surface-2': withVar('--c-surface-2'),
        line: withVar('--c-line'),
        text: withVar('--c-text'),
        muted: withVar('--c-muted'),
        faint: withVar('--c-faint'),
        // Semantic group colors, used consistently across pie, chart and legend.
        accent: withVar('--c-accent'), // interactive accent (warm)
        'accent-soft': withVar('--c-accent-soft'),
        cool: withVar('--c-cool'),
        'cool-soft': withVar('--c-cool-soft'),
        // Ordered wealth-group palette (warm = top, cool = bottom).
        g1: withVar('--c-g1'), // top 1%
        g2: withVar('--c-g2'), // next 9%
        g3: withVar('--c-g3'), // middle 40%
        g4: withVar('--c-g4'), // bottom 50%
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1.25rem',
        control: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.35)',
        sheet: '0 -8px 40px -12px rgb(0 0 0 / 0.5)',
        pop: '0 8px 30px -8px rgb(0 0 0 / 0.45)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-4px)' },
          '75%': { transform: 'translateY(4px)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
