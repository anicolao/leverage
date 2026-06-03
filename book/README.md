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
- Production region: `margin-rate-from-prime` in
  `src/lib/backtest/dcaSimulator.ts`
- Production region: `default-dca-scenario-parameters` in
  `src/lib/backtest/defaultScenario.ts`
- Production regions: `synthetic-xaw-default-weights`,
  `synthetic-xaw-total-return`, and `synthetic-xaw-price` in
  `src/lib/backtest/marketData.ts`
- Production regions: `annual-distributions` and `total-return-index` in
  `src/lib/backtest/marketData.ts`
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
