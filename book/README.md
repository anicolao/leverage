# Book

This directory contains the LiTScript book for the leveraged XAW DCA simulator.

Production code in `src/lib/backtest` remains the source of truth. Chapter
prose expands named production regions, and interactive examples import the
same helpers that the app uses.

## Current Chapters

- Chapter: `book/chapters/01-what-this-simulator-tests.md`
- Chapter: `book/chapters/prime-margin-heloc-interest.md`
- Production region: `margin-rate-from-prime` in
  `src/lib/backtest/dcaSimulator.ts`
- Production region: `default-dca-scenario-parameters` in
  `src/lib/backtest/defaultScenario.ts`
- Interactive component: `book/components/InterestAccrualDemo.ts`
- Regression fixtures: `book/examples/interest-fixture.ts` and
  `book/examples/default-scenario.ts`
- Verification: `book/examples/examples.test.ts`

Run:

```sh
npm run book:build
npm run book:check
```
