---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Debt, Equity, and Margin Leverage

Margin debt is the broker loan inside the investment account. HELOC debt is a
separate loan outside the brokerage account. Equity is assets minus debt.

## Brokerage Risk

The brokerage cares about the margin loan because that loan is secured by the
shares in the account. If account equity is too low, the brokerage can trigger a
margin call and sell shares. HELOC debt still matters to household solvency,
but it does not directly determine the broker's margin-call threshold.

## Targeting Margin Leverage

The leverage target is `marginDebt / shareValue`. The simulator uses that ratio
to keep broker debt at the selected percentage of brokerage share value.

<<r:margin-leverage-target>>

HELOC debt is excluded from the target because it is not broker debt inside the
margin account, so it does not decide whether the broker liquidates the account.

<leverage-board-lot-demo></leverage-board-lot-demo>

## Recording Equity

After trades and HELOC cap checks, the simulator records assets, debt, and
equity.

<<r:checkpoint-row>>

A leveraged portfolio can have a large share value and still have weak or
negative equity if debt is larger, so equity is recorded as the net claim left
for the investor.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates margin debt targeting and
checks that reported equity equals total assets less total debt.
