---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Contributions and Investment Target

A contribution is a new HELOC-funded investment amount. The investment target
is the maximum cumulative contribution, not the target portfolio value, because
the investor controls how much new borrowed cash is deployed but does not
control XAW's market return, interest cost, rounding result, or forced-sale
pressure. This distinction keeps the input honest: the target says how much the
strategy tries to invest, not what the account promises to be worth.

## Target Limit

At each monthly checkpoint, the simulator contributes the smaller of the monthly
amount and the remaining target.

<<r:monthly-contribution-target>>

The `Math.min` keeps the final contribution from overshooting the target when
the remaining contribution room is smaller than the monthly amount.

<contribution-demo></contribution-demo>

The chart shows cumulative contribution against HELOC debt on the same real
2023 `XAW.TO` checkpoints used throughout this part. HELOC debt can be higher
than cumulative contribution because capitalized interest is also debt, which
is why the simulator tracks both fields instead of using one as a proxy for the
other.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that monthly contributions
follow the cadence and that table summaries do not change the contribution
schedule.
