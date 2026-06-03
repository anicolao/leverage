---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Monthly Step

The simulator reads daily market rows but records portfolio checkpoints monthly.
A checkpoint is a saved account state after interest, distributions,
contributions, rebalancing, and cap checks have been handled.

## Monthly Checkpoints

Monthly checkpoints match the intended contribution cadence. Daily checkpoints
would create noise, while annual checkpoints would hide the path where leverage
stress can build.

## Accrual Before The Checkpoint

Interest is accrued between market rows, and distributions are accumulated as
cash.

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
