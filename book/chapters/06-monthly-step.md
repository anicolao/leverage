---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Monthly Step

The simulator reads daily market rows because prices, elapsed days, and
distribution events happen on trading days. It records portfolio checkpoints
monthly because the strategy contributes monthly and the reader needs a table
that follows the investment cadence instead of a noisy daily ledger. A
checkpoint is the account state after the month-to-date interest,
distributions, contribution, margin rebalance, HELOC cap check, and risk fields
have all been resolved.

## Checkpoints From Daily Data

Monthly checkpoints matter because leverage risk is path-dependent. If the
book skipped straight from January to December, the reader could see the ending
equity but not the months where debt, rounding cash, interest, or HELOC
capacity changed the strategy's room to maneuver. The demo below uses the
stored 2023 Yahoo Finance `XAW.TO` fixture, so the monthly rows are produced
from actual daily closes and dividend events rather than a three-row toy
market.

Interest is accrued between market rows, and distributions are accumulated as
cash before the monthly checkpoint handles the account rules.

<<r:monthly-interest-accrual>>

Interest accrues daily because cost depends on elapsed time, not just the
number of months. Using calendar days makes a short month and a long month
accrue different interest.

<monthly-step-demo></monthly-step-demo>

## Checkpoint Order

The monthly order is: snapshot rates and pending cash flows, handle margin
interest, pay HELOC interest, draw the contribution, rebalance margin leverage,
enforce the HELOC cap, record the row, and reset pending totals.

The order matters because using distributions before share sales can avoid
selling shares, while enforcing the HELOC cap after contribution shows whether
the new draw pushed debt beyond the configured limit.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` covers the monthly step through focused
fixtures for leverage targeting, interest handling, distribution-first HELOC
payments, HELOC cap enforcement, board-lot rounding, drawdown, and summaries.
