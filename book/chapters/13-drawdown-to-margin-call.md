# Drawdown to Margin Call

The drawdown fields answer: how far can share value fall before the margin
account reaches the maintenance-margin threshold used by the simulator?

## Maintenance Requirement

The current simulator uses a maintenance margin requirement of `30%`. That
means margin debt cannot exceed `70%` of account assets under the simplified
formula.

## Closed Form

The helper computes the share-value decline that would make account assets just
large enough for the current margin debt:

<<r:drawdown-to-maintenance-margin-call>>

Cash balance reduces the share value required to satisfy the maintenance
formula. For collapse drawdown, the simulator passes
`cashBalance + remainingHelocCapacity`, modelling the idea that remaining HELOC
capacity could temporarily support the brokerage account.

## Interpretation

`marginCallDrawdown` is not a broker guarantee. It is the simulator's simplified
distance-to-threshold calculation. Real broker rules may vary by security,
currency, concentration, account type, and intraday policy.

`collapseDrawdown` is even more model-dependent because it includes remaining
HELOC capacity. It is best read as a stress indicator, not as a lender promise.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates drawdown values with a direct
fixture that has exact expected `marginCallDrawdown` and `collapseDrawdown`
values.
