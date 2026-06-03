---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Drawdown to Margin Call

## What

A drawdown is a percentage decline from the current share value. A margin call
is the point where the brokerage can demand more equity or sell shares because
the account no longer satisfies maintenance margin.

## Why

The investor wants to avoid a margin call because it can force selling after a
large price drop. Forced selling at low prices can turn a temporary drawdown
into a permanent loss of share count.

## How

The simulator uses a simplified maintenance margin requirement of `30%`. That
means the account must keep enough assets so margin debt is no more than `70%`
of account assets.

<<r:drawdown-to-maintenance-margin-call>>

Why cash is included: cash supports account assets, so it reduces the share
value needed to satisfy the maintenance formula.

<drawdown-demo></drawdown-demo>

## Collapse Drawdown

Collapse drawdown uses the same formula but adds remaining HELOC capacity to
cash. Why: it shows a broader stress threshold if unused HELOC capacity can
temporarily support the margin account. This is a model assumption, not a lender
guarantee.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates exact expected
`marginCallDrawdown` and `collapseDrawdown` values in a direct fixture.
