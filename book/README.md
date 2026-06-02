# Book Pilot

This directory contains the first LiTScript pilot for the leveraged XAW DCA
simulator book.

The pilot keeps production code in `src/lib/backtest` as the source of truth.
Chapter prose expands named production regions, and interactive examples import
the same helpers that the app uses.

## Pilot Scope

- Chapter: `book/chapters/prime-margin-heloc-interest.md`
- Production region: `margin-rate-from-prime` in
  `src/lib/backtest/dcaSimulator.ts`
- Interactive component: `book/components/InterestAccrualDemo.ts`
- Regression fixture: `book/examples/interest-fixture.ts`
- Verification: `book/examples/examples.test.ts`

Run:

```sh
npm run book:build
npm run book:check
```
