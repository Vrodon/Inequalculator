# Inequalculator

**Inequalculator** (from *inequality* + *calculator*) is an interactive, mobile-first
web app that shows — using real data from the **United States, United Kingdom and
Germany** — how the compounding of **asset returns above the growth rate of the
overall economy** (Thomas Piketty's *r > g*) increases **wealth inequality** over
time.

It is a neutral sandbox for exploring a mechanism, **not advocacy** and **not a
forecast**. Everything runs client-side; there is no backend and no tracking.

> The economy grows for everyone — but assets tend to compound faster than wages.
> Explore who ends up owning the growth.

---

## Highlights

- **A growing "pie"** — a donut whose area is proportional to total wealth, split
  into the top 10% and everyone else, with a dashed ring marking the year-0 size.
- **A divergence chart** — the top group's share of wealth over time, scrubbable
  by year.
- **Animated stat tiles** and a plain-language readout that always states both
  sides: *"Everyone is 5.2× richer than year 0 — but the top 10% now owns 82%."*
- **Country presets** (US / UK / Germany / Custom), each number carrying its
  source in a tooltip.
- **A neutral "what could change this?" lever** — an annual wealth tax you can
  watch bend the curve.
- **Simple and Advanced views**, dark/light themes, first-visit onboarding, full
  keyboard support and `prefers-reduced-motion` handling.

---

## Tech stack

- [React](https://react.dev) + [Vite](https://vite.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) with a CSS-variable design-token theme
- [Framer Motion](https://www.framer.com/motion/) for all animation
- [D3](https://d3js.org) (`d3-shape`, `d3-scale`, `d3-array`) for the two bespoke charts
- [react-i18next](https://react.i18next.com) (i18n-ready; ships English only)
- Self-hosted [Inter](https://rsms.me/inter/) variable font (bundled, not hotlinked)
- [Vitest](https://vitest.dev) for unit tests (the model is fully tested)

---

## Local setup

You'll need **Node.js 20+** and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

Then open the URL that Vite prints.

### Available scripts

| Script            | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot reload       |
| `npm run build`   | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally              |
| `npm test`        | Run the model unit tests once (Vitest)          |
| `npm run lint`    | Lint the codebase (ESLint)                       |
| `npm run format`  | Format the codebase (Prettier)                   |

### Optional configuration

The footer's "View source on GitHub" link reads `VITE_REPO_URL`. Copy
`.env.example` to `.env` and set it to your repository URL (or edit
`src/config.ts`).

---

## How the model works

The core lives in **[`src/model/simulation.ts`](src/model/simulation.ts)** — a
pure, side-effect-free module with no React, so the math is auditable and unit-
tested. The UI is a thin layer on top.

It is a deliberately **stylized two-group compounding model**. The population is
split into a **top group** (by default the top 10%) and **everyone else**. All
returns are **real (inflation-adjusted)**.

Starting from a total wealth of 1, split by the top group's initial share, each
year:

```
wTop *= 1 + r/100 + s/100      # top group earns the asset return r (+ extra saving s)
wBot *= 1 + g/100              # everyone else grows with the economy g
if wealthTax > 0:              # optional annual wealth tax, redistributed
    transfer = wTop * wealthTax/100
    wTop -= transfer
    wBot += transfer
```

From the resulting series, at any selected year the app derives:

- **Economy multiple** — `total / total₀` ("the economy is N× bigger").
- **Per-capita ratio** — `(wTop / popTop) / (wBot / popBot)` ("the top owns N×
  more per person").
- **Gini** — for a two-group split this is exactly `popBot − bottomShare`
  (clamped to ≥ 0), assuming equality within each group.

### Assumptions and what the model leaves out

This is an **illustration of one mechanism, not a forecast**. In particular:

- The bottom group also owns assets (homes, pensions), so a clean two-group split
  with a single return each is a simplification.
- People move between groups over time, and new fortunes enter the top.
- Empirically, top wealth shares have risen sharply in the **US** but have been
  comparatively **flatter in the UK and Germany**.
- A prominent academic view (Matthew Rognlie) attributes much of the rising
  capital share specifically to **housing**.
- The effectiveness of a **wealth tax** is debated (valuation, avoidance, capital
  flight).

You can test all of this by moving `r`, `g` and the wealth-tax lever, and by
comparing countries. The full two-sided discussion is in the app's *"How to read
this"* panel.

---

## Data sources

Presets and citations live in
**[`src/data/presets.ts`](src/data/presets.ts)**. Every figure is an
illustrative anchor; each surfaces its source in the UI.

| Preset             | Top-10% wealth share | Asset return (r) | Economy growth (g) |
| ------------------ | -------------------- | ---------------- | ------------------ |
| **United States**  | 67%                  | 6.5%             | 2.0%               |
| **United Kingdom** | 50% (range 43–57%)   | 5.5%             | 1.5%               |
| **Germany**        | 60% (range 54–63%)   | 5.5%             | 1.0%               |

- **US top-10% share** — [Federal Reserve DFA / St. Louis Fed](https://www.stlouisfed.org/open-vault/2025/june/the-state-of-us-household-wealth)
  (Q4 2024 ≈ 67.2%; top 1% ≈ 31%, bottom 50% ≈ 2.5%).
- **US economy growth** — [U.S. Bureau of Economic Analysis](https://www.bea.gov/data/gdp/gross-domestic-product).
- **US asset return** — [NYU Stern / Damodaran](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html)
  (US equities long-run real ≈ 7%, set slightly below for diversified portfolios).
- **UK top-10% share** — [ONS Wealth & Assets Survey](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth)
  (official ≈ 43%, adjusted upward via IFS / WID for under-coverage of the very wealthy).
- **UK economy growth** — [ONS / Office for Budget Responsibility](https://obr.uk/).
- **UK asset return** — Barclays Equity Gilt Study (UK equities real ≈ 5.1% since 1899).
- **Germany top-10% share** — [Deutsche Bundesbank](https://www.bundesbank.de) survey ≈ 54%; [WID](https://wid.world) top-adjusted ≈ 60%.
- **Germany economy growth** — [Destatis / Bundesbank](https://www.destatis.de/EN/) (recent real GDP ≈ 0–1%).
- **Germany asset return** — [Deutsches Aktieninstitut — DAX-Renditedreieck](https://www.dai.de/renditedreieck/) (DAX real ≈ 5–6%), cross-checked with Piketty.
- **Conceptual basis** — Thomas Piketty, *Capital in the Twenty-First Century*.

---

## Project structure

```
inequalculator/
├── index.html
├── src/
│   ├── main.tsx / App.tsx
│   ├── model/simulation.ts        # pure math — the core engine
│   ├── model/simulation.test.ts   # Vitest unit tests
│   ├── data/presets.ts            # country presets + sources
│   ├── components/                # charts, controls, panels, primitives
│   ├── state/                     # store, theme, onboarding hooks
│   ├── i18n/                      # react-i18next config + en.json
│   ├── lib/format.ts              # number formatting
│   └── styles/index.css           # design tokens + base styles
└── ...config files
```

### Extending the model (planned fast-follow)

The core exposes a small `Lens` interface (`{ id, run(params) }`). The default
lens is wealth compounding; a future **housing lens** (home prices compounding at
the asset rate vs wages at the economy rate) can implement the same interface and
slot into the UI without reworking the core. i18n is already wired up so more
languages (starting with German) can be added under `src/i18n/`.

---

## Deploy to Vercel

You don't need to be a developer to put this online for free.

1. Push this project to a **GitHub** repository (see below).
2. Go to **[vercel.com](https://vercel.com)** and **sign in with GitHub**.
3. Click **"Add New… → Project"**, then **Import** your `inequalculator` repo.
4. Vercel auto-detects **Vite** — you don't need to change any settings. Just
   click **Deploy**.
5. After a minute you'll get a live URL like `inequalculator.vercel.app`. That's
   your app — share it anywhere.
6. *(Optional)* In the project's **Settings → Domains**, add your own custom
   domain.

Every time you push to GitHub, Vercel redeploys automatically. This is a plain
single-page Vite app with no server-side routing, so no `vercel.json` is needed.

### Pushing to GitHub

```bash
# after creating an empty repo named "inequalculator" on github.com:
git remote add origin https://github.com/<your-username>/inequalculator.git
git branch -M main
git push -u origin main
```

---

## License

MIT — see [`package.json`](package.json). Data figures belong to their
respective sources, cited above.
