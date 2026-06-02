# Literate Conversion Plan

## Goal

Turn the current simulator into an executable book. The book should explain
the investment scheme exactly as implemented, expose the core algorithms, show
the production code behind those algorithms, and let readers run focused
experiments that build confidence in the implementation.

The finished artifact should serve two audiences:

1. A technically curious investor who wants to understand the leveraged XAW
   dollar-cost averaging strategy, its parameters, and its failure modes.
2. A developer or reviewer who wants to verify that the simulator implements
   the stated mechanics correctly.

The book should document and motivate only what exists now.

## Current Simulator Scope

The current SvelteKit app implements:

- Synthetic XAW validation against real `XAW.TO`.
- Price, total return, and distribution comparison charts.
- A leveraged monthly DCA simulator using a synthetic XAW proxy.
- HELOC-funded contributions.
- Margin debt targeting as a percentage of brokerage assets.
- HELOC interest using Canadian prime.
- Margin interest using prime less 0.95 percentage points.
- Distribution cash applied to HELOC interest before share sales.
- Configurable margin-interest capitalization policy.
- Maximum HELOC debt enforcement through share sales.
- Board-lot rounding and cash-balance tracking.
- Tax deduction tracking as interest less distributions.
- Margin-call and collapse drawdown calculations.
- Cumulative fixed-horizon outcome histograms over sampled start dates.
- Interactive charts, hover readouts, tables, and progress feedback.

This is the complete subject matter of the book.

## Recommended Approach

Use a docs-as-product approach rather than rewriting the simulator into a
notebook. Keep production TypeScript modules as the source of truth, and build
a book that imports, displays, tests, and exercises those modules.

The preferred first tool to evaluate is LiTScript because it is built around
literate, interactive TypeScript. Its documentation says it can extract
Markdown from JSDoc comments, use the TypeScript compiler API for type and
symbol information, insert code snippets from TypeScript regions, and embed
dynamic content through web components. Those properties match this project
better than a Python-first notebook system.

Do not fully commit to LiTScript until a pilot page proves that it works
cleanly with SvelteKit, Vite, and Vitest. If the pilot is awkward, use a
SvelteKit-native book route that renders Markdown and imports the same
interactive Svelte components.

## Non-Negotiable Requirements

- The code shown in the book must come from production source files or
  source-controlled examples that are tested.
- The interactive examples must call the same simulator functions used by the
  app, not copied versions.
- Each chapter must have at least one validation artifact: a unit test,
  invariant check, fixture comparison, or interactive reproduction.
- The book must distinguish model assumptions from measured data.
- Parameter explanations must include operational meaning, units, default
  values, valid ranges, and likely interpretation traps.
- Every chart and table in the book must state what question it answers.

## Proposed Book Structure

### Part 1: Orientation

1. **What This Simulator Tests**
   - Explain the strategy in plain language: borrow through a HELOC, invest
     monthly into the synthetic XAW proxy, maintain target margin leverage,
     service interest, and observe long-run outcomes.
   - Define HELOC debt, margin debt, brokerage assets, total debt, equity,
     leverage, distributions, interest, capitalized interest, and cash balance.
   - State clearly that this is a backtest and educational simulator, not
     investment or tax advice.
   - Show the main parameter set and the default scenario.

2. **How To Read The Interface**
   - Walk through the main app: validation charts, simulator controls,
     portfolio path chart, checkpoint table, and outcome histogram.
   - Explain what each section is for.
   - Explain which questions the app can answer:
     - How close is the synthetic XAW proxy to real XAW?
     - How does leverage evolve through history?
     - How much debt and equity remain after a selected period?
     - How sensitive are outcomes to start date?
     - How close does the portfolio get to a margin call?
   - Explain what the app cannot answer, such as prospective market returns.

### Part 2: Market Data

3. **The Synthetic XAW Proxy**
   - Explain why `XAW.TO` needs a synthetic pre-inception history.
   - Show the proxy inputs: `SPY`, `EFA`, `EEM`, and `CAD=X`.
   - Explain the CAD conversion and weighting.
   - Explain the splice from synthetic history into actual `XAW.TO`.
   - Show the relevant code from `src/lib/backtest/marketData.ts`.
   - Interactive validation: overlay synthetic and actual XAW over the overlap
     period.
   - Validation: TypeScript and Python synthetic values agree for fixtures.

4. **Price, Distributions, and Total Return**
   - Explain raw price action versus total return.
   - Explain how distributions enter the simulator.
   - Explain the known limitation that synthetic dividends are less precise
     than synthetic price movement.
   - Interactive validation: toggle price, total return, and distribution
     charts.
   - Validation: chart rows and table rows come from the same data series.

5. **Prime and Margin Rates**
   - Explain Bank of Canada prime-rate observations and fill-forward behavior.
   - Explain that HELOC interest uses prime.
   - Explain that margin interest uses prime less 0.95 percentage points.
   - Interactive example: choose a date range and debt amount; observe HELOC
     and margin interest side by side.
   - Validation: prime `4.45%` produces margin `3.50%`.

### Part 3: Monthly Simulation

6. **The Monthly Step**
   - Present the checkpoint order of operations:
     receive distributions, accrue interest, pay HELOC interest from
     distributions, handle margin interest, draw HELOC for the contribution,
     rebalance to target margin leverage, enforce the HELOC cap, and record
     the checkpoint.
   - Show the relevant code from `src/lib/backtest/dcaSimulator.ts`.
   - Interactive stepper: move month by month and inspect state deltas.
   - Validation: fixture test with exact expected checkpoint rows.

7. **Contributions and Investment Target**
   - Explain start date, monthly investment amount, and investment target.
   - Explain that contributions are funded by HELOC debt.
   - Explain why contributions stop once cumulative contribution reaches the
     investment target.
   - Interactive example: change monthly contribution and target; observe the
     month where contributions stop.
   - Validation: cumulative contribution never exceeds the configured target.

8. **Board Lots and Cash Balance**
   - Explain why share purchases are rounded to 100-share board lots.
   - Explain why rounding can make the cash balance slightly negative.
   - Explain why distribution cash can make the cash balance positive.
   - Interactive example: vary proxy price and contribution size to see
     rounding effects.
   - Validation: rounding cash never falls below half a board lot in the
     negative direction.

9. **Debt, Equity, and Margin Leverage**
   - Explain margin debt/assets versus total debt/assets.
   - Explain why HELOC debt is outside the margin leverage target.
   - Derive the target share value from the margin leverage target.
   - Interactive chart: assets, total debt, equity, and proxy price.
   - Validation:
     - `equity = totalAssets - totalDebt`
     - `marginDebt / shareValue` tracks the leverage target after rebalancing.

10. **Interest Handling**
    - Explain HELOC interest accrual.
    - Explain margin interest accrual.
    - Explain that distributions are applied to HELOC interest first.
    - Explain that HELOC interest is paid from distributions or share sales.
    - Explain how margin interest is either sold for or capitalized to the
      HELOC depending on policy.
    - Interactive example: compare the four capitalization policies.
    - Validation: direct fixture tests for each policy.

11. **HELOC Cap Enforcement**
    - Explain max HELOC debt.
    - Explain over-limit share sales.
    - Explain how this changes total assets, debt, and equity.
    - Interactive example: lower max HELOC debt and observe forced sales.
    - Validation: HELOC debt is at or below the configured max after each
      checkpoint.

12. **Tax Deduction Column**
    - Explain the simulator's current tax-deduction calculation:
      margin interest plus HELOC interest less distributions.
    - Explain that this is a tracking column, not a full tax return.
    - Interactive example: observe how higher distributions reduce the net
      deduction.
    - Validation: `taxDeduction = interestOwing - distributionsPaid`.

### Part 4: Risk and Outcomes

13. **Drawdown to Margin Call**
    - Explain the maintenance margin requirement used by the simulator.
    - Derive the margin-call drawdown calculation.
    - Explain collapse drawdown with remaining HELOC capacity.
    - Interactive example: vary debt, cash, and share value.
    - Validation: closed-form examples with exact expected drawdowns.

14. **The Portfolio Path Chart**
    - Explain the left-axis money series: assets, debt, and equity.
    - Explain the right-axis proxy price series.
    - Explain the hover bubble and why it combines all values.
    - Interactive example: choose 2008, 2020, or 2022 start dates and inspect
      the path.
    - Validation: chart values are drawn from the same monthly rows as the
      checkpoint table.

15. **The Checkpoint Table**
    - Explain each table column in terms of `DcaSimulationRow`.
    - Explain monthly, quarterly, and annual table summarization.
    - Explain that table interval changes presentation only, not the investment
      cadence.
    - Validation: summary tests preserve monthly contribution cadence.

16. **Outcome Histograms**
    - Explain the sampled start-date window and how it clamps at the beginning
      of available data.
    - Explain fixed horizons: 5, 10, 15, and 20 years.
    - Explain complete-start filtering near the end of the data set.
    - Explain cumulative buckets: `equity >= lower bound`.
    - Explain P25, P50, and P75 rows.
    - Explain the progress meter and why the computation is chunked.
    - Interactive example: change selected start date and horizon while
      watching the bucket distribution update.
    - Validation:
      - centered sample windows,
      - beginning clamp,
      - complete-horizon filtering,
      - cumulative bucket monotonicity,
      - percentile placement.

17. **Reading Bad Outcomes**
    - Explain negative equity, forced sales, HELOC exhaustion, and margin-call
      proximity.
    - Show curated stress windows already supported by the current data:
      2008-2009, March 2020, 2022, and recent high-rate history.
    - Interactive examples should default to realistic current controls and
      let readers intentionally stress them.

## Technical Architecture

### Source Layout

Add a book-oriented structure:

```text
book/
  README.md
  chapters/
    01-orientation.md
    02-synthetic-xaw.md
    03-monthly-step.md
    04-interest.md
    05-risk-and-outcomes.md
  examples/
    interest-fixture.ts
    monthly-step-fixture.ts
    outcome-histogram-fixture.ts
  components/
    InterestAccrualDemo.svelte
    MonthlyStepExplorer.svelte
    OutcomeHistogramDemo.svelte
    SyntheticXawChart.svelte
  generated/
```

Production code remains in `src/lib/backtest`. Book examples import from
`src/lib/backtest`; they do not fork simulator logic.

### Code Annotation Pattern

Use named TypeScript regions around code worth teaching. Example:

```ts
// #region margin-interest-accrual
const marginRate = marginRateFromPrime(primeRate);
pendingMarginInterest += marginDebt * marginRate * (elapsedDays / DAYS_PER_YEAR);
// #endregion margin-interest-accrual
```

The prose chapter embeds that region and explains each variable, then links to
the corresponding unit test.

### Interactive Components

Interactive components should be ordinary Svelte components that import
production modules. They should be small and chapter-specific:

- `SyntheticXawChart.svelte`: compares synthetic and actual XAW.
- `InterestAccrualDemo.svelte`: varies debt, rate, and elapsed days.
- `MonthlyStepExplorer.svelte`: shows one checkpoint transition at a time.
- `OutcomeHistogramDemo.svelte`: reproduces the cumulative start-date outcome
  histogram with progress.
- `ScenarioPathChart.svelte`: shows the portfolio path for selected controls.

The same component boundaries should keep book examples focused on one idea at
a time.

### Test Strategy

Add chapter-level tests so prose claims stay true:

```text
src/lib/backtest/
  dcaSimulator.test.ts
  xaw.test.ts
book/examples/
  examples.test.ts
```

Each chapter should name the tests that validate it. The build should fail if
an example no longer compiles or if a fixture expectation changes.

### Build Strategy

First evaluate LiTScript:

1. Add LiTScript as a dev dependency.
2. Add a minimal `litsconfig.json`.
3. Generate one static chapter from Markdown plus a TypeScript region.
4. Embed one custom interactive component.
5. Confirm that `npm run check`, `npm test`, and the book build can coexist.

If the pilot succeeds, add scripts:

```json
{
  "scripts": {
    "book:dev": "lits --serve",
    "book:build": "lits",
    "book:check": "npm run check && npm test && npm run book:build"
  }
}
```

If LiTScript fights the SvelteKit/Vite stack, use a SvelteKit-native route:

```text
src/routes/book/+layout.svelte
src/routes/book/[chapter]/+page.svelte
src/lib/book/chapters.ts
```

The fallback keeps the same chapter structure and interactive components, but
renders Markdown through a Svelte-compatible Markdown pipeline.

## Conversion Phases

### Phase 0: Editorial Inventory

- Build a glossary of all financial terms used in the UI.
- Create a table mapping UI controls to simulator input fields.
- Create a table mapping table columns to `DcaSimulationRow` fields.
- Identify every chart and table in the current app and write the question it
  answers.

Deliverable: `book/README.md` plus glossary draft.

### Phase 1: Tool Pilot

- Install and configure LiTScript.
- Create one pilot chapter: "Prime, Margin, and HELOC Interest".
- Embed the production code region for margin-rate calculation.
- Embed an interactive interest calculator component.
- Link to the regression test proving prime `4.45%` maps to margin `3.50%`.

Decision gate: keep LiTScript only if the pilot gives good source links,
readable output, easy local development, and clean CI integration.

### Phase 2: Core Algorithm Chapters

- Write chapters for XAW construction, monthly simulation steps, leverage,
  interest capitalization, HELOC cap handling, drawdown, and outcome
  histograms.
- Add named regions to `marketData.ts`, `bankOfCanada.ts`, and
  `dcaSimulator.ts`.
- Add small fixtures when current tests are too broad for chapter-level
  explanation.

Deliverable: the book covers all current simulator behavior.

### Phase 3: Reader Experiments

- Extract reusable Svelte components from the current single-page UI.
- Create chapter-specific experiments with narrow control surfaces.
- Add scenario presets using current simulator controls:
  - 2008 crisis start,
  - March 2020 start,
  - 2022 drawdown,
  - high HELOC cap,
  - constrained HELOC cap,
  - never capitalize margin interest,
  - always capitalize margin interest.

Deliverable: every core chapter has a "try it" block.

### Phase 4: Publication and Verification

- Add `npm run book:build`.
- Add `npm run book:check`.
- Add a local verification checklist:
  - TypeScript/Svelte check,
  - Vitest,
  - Python pytest if Python parity remains part of the current simulator,
  - Ruff if Python parity remains part of the current simulator,
  - book build.
- Publish static output through the same hosting path as the app or under
  `/book`.

## Refactors Needed Before A Good Book

The current `src/routes/+page.svelte` is doing too much. Before writing many
chapters, split it into components:

- `ValidationCharts.svelte`
- `SimulationControls.svelte`
- `PortfolioPathChart.svelte`
- `SimulationTable.svelte`
- `OutcomeHistogram.svelte`

This makes the book easier because interactive examples can reuse those
components without dragging in the whole application shell.

Also split `dcaSimulator.ts` into smaller conceptual modules once the book
outline stabilizes:

- `interest.ts`
- `leverage.ts`
- `dcaSimulator.ts`
- `outcomes.ts`
- `dates.ts`

Do this gradually and only when it improves the book or reduces duplication.
The conversion should preserve current behavior at every step.

## Risks

- **Tool risk:** LiTScript may not fit smoothly with SvelteKit. Mitigation:
  run a one-chapter pilot and keep a SvelteKit-native fallback.
- **Narrative drift:** The prose may drift away from implementation details.
  Mitigation: every algorithmic claim links to production code and a test.
- **Code duplication:** Interactive examples may tempt copied logic. Mitigation:
  examples import production modules only.
- **Performance:** Outcome histograms are expensive. Mitigation: keep the
  progressive progress-meter pattern and consider a web worker for book demos
  if the interactive chapters run multiple scenarios.
- **Financial precision:** The simulator is educational. Mitigation: state
  model assumptions clearly and avoid claims beyond what the current code
  computes.

## Definition of Done

The literate conversion is successful when:

- A reader can start at chapter 1 and understand what the simulator tests.
- Every simulator parameter has a chapter explanation and an interactive
  experiment.
- Every core algorithm has visible code, prose explanation, and a linked test.
- The book build is part of the normal verification workflow.
- The book never claims correctness without showing either a test, an
  invariant, or a reproducible comparison.

## Sources Consulted

- LiTScript home: https://johtela.github.io/litscript/
- LiTScript main program documentation: https://johtela.github.io/litscript/src/index.html
