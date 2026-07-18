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
  into four groups (top 1% / next 9% / middle 40% / bottom 50%), with a dashed
  ring marking the year-0 size.
- **A divergence chart** — a 100%-stacked area of every group's share over time,
  scrubbable by year.
- **Animated stat tiles** and a plain-language readout that always states both
  sides: *"Everyone is 7.8× richer than year 0 — but the top 1% now owns 49% and
  the top 10% owns 83%."*
- **Country presets** (US / UK / Germany / Custom), each number carrying its
  source in a tooltip.
- **Multiple wealth-tax designs** — a picker with real-world templates (flat,
  “2% above 10M”, Warren, Zucman, Spain, Switzerland) plus a custom flat/threshold
  tax, redistribution options, and a live revenue + households-taxed readout.
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

The core lives in **[`src/model/wealthModel.ts`](src/model/wealthModel.ts)** — a
pure, side-effect-free module with no React, so the math is auditable and
unit-tested. The UI is a thin layer on top. (The original two-group version,
[`src/model/simulation.ts`](src/model/simulation.ts), remains as a simpler
reference.)

It splits the population into four groups — **top 1%**, **next 9%**, **middle
40%** and **bottom 50%** — and compounds each group's wealth forward one year at a
time. All returns are **real (inflation-adjusted)**.

- **Differential returns.** Wealthier groups earn higher real returns: the bottom
  50% grows at the economy rate `g`, the top 1% at the asset rate `r`, and the
  middle groups in between. This is what makes the very top pull away from the
  merely rich (Fagereng et al. 2020).
- **Currency anchoring + Pareto tail.** Because a tax like "2% above 10M" depends
  on real wealth *levels*, the model is anchored to each country's total private
  wealth and household count, and the top decile is modeled as a **Pareto
  distribution** whose index is calibrated each year from the top-1%-vs-top-10%
  concentration. Threshold and progressive taxes are then computed in closed form
  over that tail and attributed per group.
- **Wealth-tax styles.** Three designs: a **flat** rate on a group's whole wealth,
  a **marginal threshold** ("2% above X"), and **progressive brackets** (e.g.
  Warren's 2% above 50M + 3% above 1B). Revenue is redistributed to the bottom
  50% / bottom 90% / everyone, or removed.

At any selected year the app derives the economy multiple, each group's share and
per-household wealth, a grouped **Gini**, and — when a tax is active — the
annual/cumulative revenue and the number of households taxed. It is unit-tested
(`npm test`); on the US preset a Warren-style tax reproduces the Saez-Zucman
decade revenue estimate (≈ $6T) closely.

### Assumptions and what the model leaves out

This is an **illustration of one mechanism, not a forecast**. In particular:

- Within each group everyone is treated as equal (except the Pareto tail used for
  taxes), which understates inequality *inside* the top.
- People move between groups over time, and new fortunes enter the top.
- Empirically, top wealth shares have risen sharply in the **US** but have been
  comparatively **flatter in the UK and Germany**.
- A prominent academic view (Matthew Rognlie) attributes much of the rising
  capital share specifically to **housing**.
- The effectiveness of a **wealth tax** is debated (valuation, avoidance, capital
  flight).

You can test all of this by moving `r`, `g`, the group shares and the wealth-tax
lever, and by comparing countries. The full two-sided discussion is in the app's
*"How to read this"* panel.

---

## Data sources

Presets and citations live in
**[`src/data/groupPresets.ts`](src/data/groupPresets.ts)** (the original
two-group presets remain in `src/data/presets.ts`). Every figure is an
illustrative anchor and surfaces its source in the app's **Sources & assumptions**
panel.

| Share of wealth  | 🇺🇸 US | 🇬🇧 UK | 🇩🇪 DE |
| ---------------- | ----: | ----: | ----: |
| Top 1%           |   31% |  20%\* |   30% |
| Next 9%          |   36% |   30% |   30% |
| Middle 40%       | 30.5% |   45% |   37% |
| Bottom 50%       |  2.5% |    5% |    3% |
| Asset return (r) |  6.5% |  5.5% |  5.5% |
| Economy growth (g) | 2.0% | 1.5% |  1.0% |

\*The UK top-1% share is the most contested figure (ONS survey ≈ 10–13%, WID ≈ 21%).

- **Group shares** — US: [Federal Reserve DFA / St. Louis Fed](https://www.federalreserve.gov/releases/z1/dataviz/dfa/distribute/table/) (Q4 2024); UK: [ONS Wealth & Assets Survey](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth), top-adjusted with [WID](https://wid.world); DE: [Deutsche Bundesbank](https://www.bundesbank.de) + WID.
- **Asset returns** — US: [NYU Stern / Damodaran](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html); UK: Barclays Equity Gilt Study; DE: [Deutsches Aktieninstitut (DAX)](https://www.dai.de/renditedreieck/).
- **Economy growth** — US: [BEA](https://www.bea.gov/data/gdp/gross-domestic-product); UK: [ONS / OBR](https://obr.uk/); DE: [Destatis / Bundesbank](https://www.destatis.de/EN/).
- **Currency anchors** — US ≈ $158T / 131M households (Fed); UK ≈ £13.6T / 28M (ONS); DE ≈ €13.6T / 42M (Bundesbank/Destatis).
- **Differential returns** — [Fagereng, Guiso, Malacrino & Pistaferri (2020)](https://onlinelibrary.wiley.com/doi/abs/10.3982/ecta14835).
- **Wealth-tax designs** — [OECD](https://www.oecd.org/en/publications/the-role-and-design-of-net-wealth-taxes-in-the-oecd_9789264290303-en.html); [Tax Foundation](https://taxfoundation.org/data/all/eu/wealth-taxes-europe/); [Warren Ultra-Millionaire Tax](https://www.warren.senate.gov/newsroom/press-releases/warren-jayapal-boyle-reintroduce-ultra-millionaire-tax-on-fortunes-over-50-million/); [Zucman G20 blueprint](https://gabriel-zucman.eu/files/report-g20.pdf).
- **Conceptual basis** — Thomas Piketty, *Capital in the Twenty-First Century*.

---

## Project structure

```
inequalculator/
├── index.html
├── src/
│   ├── main.tsx / App.tsx
│   ├── model/wealthModel.ts       # pure N-group engine + Pareto tail + taxes
│   ├── model/wealthModel.test.ts  # Vitest unit tests
│   ├── model/simulation.ts        # original two-group model (reference) + tests
│   ├── data/groupPresets.ts       # group shares, currency anchors, tax catalog
│   ├── data/presets.ts            # original two-group presets + sources
│   ├── components/                # charts, controls, panels, primitives
│   ├── state/                     # store, theme, onboarding hooks
│   ├── i18n/                      # react-i18next config + en.json
│   ├── lib/                       # number/currency formatting, group colors
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
