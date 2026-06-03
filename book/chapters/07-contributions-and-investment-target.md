# Contributions and Investment Target

The contribution controls answer: how much HELOC-funded capital enters the
brokerage account, and when does that stop?

## Monthly Contribution Rule

At each monthly checkpoint, the simulator contributes the smaller of the
configured monthly amount and the remaining investment target.

<<r:monthly-contribution-target>>

The contribution is immediately added to cumulative contribution and HELOC
debt. This models a HELOC draw used to fund the investment account.

## Interpretation

`monthlyContribution` is a monthly attempted draw, in Canadian dollars.
`investmentTarget` is the maximum cumulative contribution, in Canadian dollars.
Once cumulative contribution reaches the target, future monthly contributions
are zero.

A common interpretation trap is to read the target as a portfolio value target.
It is not. Price movement, margin debt, forced sales, and distribution cash can
make portfolio assets very different from cumulative contribution.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that the first checkpoint
draws the configured monthly contribution and that quarterly or annual table
summaries do not change the monthly contribution cadence.
