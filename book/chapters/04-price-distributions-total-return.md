---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Price, Distributions, and Total Return

The app separates raw price, distribution cash, and total return. Price is the
daily close. A distribution is cash paid per share. Total return is growth after
including distributions as if they were reinvested.

## Why The App Separates Them

The simulator needs all three because they answer different questions. Price
tells the simulator how many shares can be bought or sold. Distributions tell
the simulator how much cash is available for HELOC interest. Total return tells
the reader whether the synthetic proxy tracks actual XAW when distributions are
included.

## Annual Distributions

For the distribution chart, daily cash distributions are aggregated by calendar
year.

<<r:annual-distributions>>

Annual bars make the cash pattern readable because daily distribution rows are
sparse and hard to compare visually.

## Total Return Index

The total-return index combines price movement and distribution yield.

<<r:total-return-index>>

This formula is used because if price rises from `$100` to `$110` and pays `$5`
of cash, the investor's economic return is not just `10%`; it is `15%` before
costs.

The example uses the same stored 2023 Yahoo rows as the synthetic-proxy
chapter. The chart compares actual XAW close values with the scaled synthetic
price proxy; the table includes the beginning of the year, the actual XAW
distribution dates, and the end of the year so price, distribution cash, and
total return can be read together.

<return-distribution-demo></return-distribution-demo>

## Limitation

Synthetic distributions are less precise than synthetic price movement because
ETF distribution policy is fund-specific. The proxy estimates component
distributions after CAD conversion and calibrated drag; it cannot recreate
future XAW distribution policy before XAW existed.

## Validation Artifact

`book/examples/examples.test.ts` checks the stored real-data fixture and its
computed comparison. `src/lib/backtest/xaw.test.ts` validates the lower-level
rules: `totalReturnIndex` includes both price movement and distributions, and
`annualDistributions` aggregates daily cash distributions by calendar year.
