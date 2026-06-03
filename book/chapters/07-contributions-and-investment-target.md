---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Contributions and Investment Target

## What

A contribution is a new HELOC-funded investment amount. The investment target
is the maximum cumulative contribution, not the target portfolio value.

## Why

The distinction matters because borrowed contributions are under the investor's
control, while final portfolio value depends on market returns, interest,
rounding, forced sales, and distributions.

## How

At each monthly checkpoint, the simulator contributes the smaller of the monthly
amount and the remaining target.

<<r:monthly-contribution-target>>

Why the `Math.min` is there: the final contribution may be smaller than the
monthly amount so cumulative contributions do not overshoot the target.

<contribution-demo></contribution-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that monthly contributions
follow the cadence and that table summaries do not change the contribution
schedule.
