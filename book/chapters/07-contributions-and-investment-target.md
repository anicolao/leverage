---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Contributions and Investment Target

A contribution is a new HELOC-funded investment amount. The investment target
is the maximum cumulative contribution, not the target portfolio value.

## Contribution Cadence

The distinction matters because borrowed contributions are under the investor's
control, while final portfolio value depends on market returns, interest,
rounding, forced sales, and distributions.

## Target Limit

At each monthly checkpoint, the simulator contributes the smaller of the monthly
amount and the remaining target.

<<r:monthly-contribution-target>>

The `Math.min` keeps the final contribution from overshooting the target when
the remaining contribution room is smaller than the monthly amount.

<contribution-demo></contribution-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that monthly contributions
follow the cadence and that table summaries do not change the contribution
schedule.
