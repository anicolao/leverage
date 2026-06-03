---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Price, Distributions, and Total Return

## What

The app separates raw price, distribution cash, and total return. Price is the
daily close. A distribution is cash paid per share. Total return is growth after
including distributions as if they were reinvested.

## Why

The simulator needs all three because they answer different questions. Price
tells the simulator how many shares can be bought or sold. Distributions tell
the simulator how much cash is available for HELOC interest. Total return tells
the reader whether the synthetic proxy tracks actual XAW when distributions are
included.

## How: Distributions

For the distribution chart, daily cash distributions are aggregated by calendar
year.

<<r:annual-distributions>>

Why this is yearly: annual bars make the cash pattern readable. Daily
distribution rows are sparse and hard to compare visually.

## How: Total Return

The total-return index combines price movement and distribution yield.

<<r:total-return-index>>

Why this formula: if price rises from `$100` to `$110` and pays `$5` of cash,
the investor's economic return is not just `10%`; it is `15%` before costs.

<return-distribution-demo></return-distribution-demo>

## Limitation

Synthetic distributions are less precise than synthetic price movement because
ETF distribution policy is fund-specific. The proxy estimates component
distributions after CAD conversion and calibrated drag; it cannot recreate
future XAW distribution policy before XAW existed.

## Validation Artifact

`src/lib/backtest/xaw.test.ts` validates that `totalReturnIndex` includes both
price movement and distributions, and that `annualDistributions` aggregates
daily cash distributions by calendar year.
