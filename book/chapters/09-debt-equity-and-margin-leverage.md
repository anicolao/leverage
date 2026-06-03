# Debt, Equity, and Margin Leverage

The leverage chapter answers: which debt is targeted by the broker margin
control, and how does the simulator compute equity?

## Margin Debt Versus Total Debt

Margin leverage is broker margin debt divided by share value:
`marginDebt / shareValue`.

HELOC debt is outside that target. HELOC debt still affects total debt and
equity, but it does not directly determine the broker margin rebalance.

## Target Share Value

The target share value is derived from brokerage equity after contribution and
the desired margin leverage:

<<r:margin-leverage-target>>

If the target is 20%, brokerage equity must represent 80% of the desired share
value. The simulator therefore divides brokerage equity by `1 - leverageTarget`
to get desired share value, then sets desired margin debt to
`desiredShareValue * leverageTarget`.

## Checkpoint Accounting

After trades and HELOC cap enforcement, the simulator records assets, debt, and
equity:

<<r:checkpoint-row>>

`totalAssets = shareValue + cashBalance`.
`totalDebt = marginDebt + helocDebt`.
`equity = totalAssets - totalDebt`.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates margin debt targeting and
checks that reported equity equals total assets less total debt in fixtures that
include distributions and cash balance.
