# The Checkpoint Table

The checkpoint table answers: what exactly did the simulator record after each
monthly checkpoint?

## Row Type

Every table row is a `DcaSimulationRow`. The row contains date, price, moving
average, contribution, trade amount, share count, distributions, rates,
interest, debt, assets, equity, leverage, HELOC capacity, and drawdown metrics.

The row is recorded after interest handling, contribution, margin rebalancing,
HELOC cap enforcement, and account-value calculations:

<<r:checkpoint-row>>

## Table Intervals

The table can summarize rows monthly, quarterly, or annually. This changes only
the presentation interval.

<<r:summarize-simulation-rows>>

For quarterly and annual summaries, the last row in the period supplies ending
state fields such as shares, assets, debt, and equity. Flow fields such as
contribution, trade amount, distributions, interest, sales, and capitalized
interest are summed across the period.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that quarterly and annual
summaries preserve monthly contribution cadence and correctly sum monthly flow
fields while using the period-ending checkpoint for state fields.
