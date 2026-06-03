# The Monthly Step

The simulator walks through daily market rows, but it records portfolio
checkpoints on the first trading date of each month. Between checkpoints it
accrues interest and accumulates distributions.

## Daily Accrual Before A Checkpoint

Before a monthly checkpoint, interest is accrued from the previous market row
to the current market row. Distributions are also accumulated as cash.

<<r:monthly-interest-accrual>>

This means interest is not computed from a fixed 30-day month. It uses the
elapsed calendar days between available market rows and `365.25` days per year.

## Checkpoint Order

At a monthly checkpoint, the implementation follows this order:

1. Read the current 120-day moving average, prime rate, and margin rate.
2. Snapshot pending margin interest, HELOC interest, total interest, and
   distributions.
3. Handle margin interest according to the selected capitalization policy.
4. Pay HELOC interest from distribution cash first, then by selling shares.
5. Draw HELOC debt for the monthly contribution, capped by the investment
   target.
6. Rebalance margin debt and shares toward the target margin leverage.
7. Enforce the maximum HELOC debt through share sales.
8. Record a `DcaSimulationRow`.
9. Reset pending monthly interest and distribution totals.

The order matters. For example, distributions are available to pay HELOC
interest before new monthly contributions are drawn, and HELOC cap enforcement
happens after contribution and margin rebalancing.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` covers the monthly step through focused
fixtures: margin debt targeting, interest capitalization, distribution-first
HELOC interest payment, HELOC cap enforcement, board-lot rounding, drawdown
calculation, and row summarization.
