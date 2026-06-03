# Book

This directory contains the LiTScript book for the leveraged XAW DCA simulator.

Production code in `src/lib/backtest` remains the source of truth. Chapter
prose expands named production regions, and interactive examples import the
same helpers that the app uses.

## Current Chapters

- Chapter: `book/chapters/01-what-this-simulator-tests.md`
- Chapter: `book/chapters/02-how-to-read-the-interface.md`
- Chapter: `book/chapters/03-synthetic-xaw-proxy.md`
- Chapter: `book/chapters/04-price-distributions-total-return.md`
- Chapter: `book/chapters/05-prime-and-margin-rates.md`
- Chapter: `book/chapters/06-monthly-step.md`
- Chapter: `book/chapters/07-contributions-and-investment-target.md`
- Chapter: `book/chapters/08-board-lots-and-cash-balance.md`
- Chapter: `book/chapters/09-debt-equity-and-margin-leverage.md`
- Chapter: `book/chapters/10-interest-handling.md`
- Chapter: `book/chapters/11-heloc-cap-enforcement.md`
- Chapter: `book/chapters/12-tax-deduction-column.md`
- Chapter: `book/chapters/13-drawdown-to-margin-call.md`
- Chapter: `book/chapters/14-portfolio-path-chart.md`
- Chapter: `book/chapters/15-checkpoint-table.md`
- Chapter: `book/chapters/16-outcome-histograms.md`
- Chapter: `book/chapters/17-reading-bad-outcomes.md`
- Production region: `margin-rate-from-prime` in
  `src/lib/backtest/dcaSimulator.ts`
- Production region: `default-dca-scenario-parameters` in
  `src/lib/backtest/defaultScenario.ts`
- Production regions: `synthetic-xaw-default-weights`,
  `synthetic-xaw-total-return`, and `synthetic-xaw-price` in
  `src/lib/backtest/marketData.ts`
- Production regions: `annual-distributions` and `total-return-index` in
  `src/lib/backtest/marketData.ts`
- Production regions for simulation mechanics in
  `src/lib/backtest/dcaSimulator.ts`: `monthly-interest-accrual`,
  `monthly-interest-handling`, `monthly-contribution-target`,
  `margin-leverage-target`, `heloc-cap-enforcement`, `checkpoint-row`,
  `summarize-simulation-rows`, `equity-outcome-start-dates`,
  `equity-outcome-histogram`, `equity-outcome-buckets`,
  `capitalization-policy`, and `drawdown-to-maintenance-margin-call`
- Interactive component: `book/components/InterestAccrualDemo.ts`
- Regression fixtures: `book/examples/interest-fixture.ts` and
  `book/examples/default-scenario.ts`
- Interface inventory: `book/examples/interface-inventory.ts`
- Verification: `book/examples/examples.test.ts`

Run:

```sh
npm run book:build
npm run book:check
```
