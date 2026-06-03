# Board Lots and Cash Balance

The simulator rounds share holdings to 100-share board lots when it rebalances
to the target margin leverage.

## Rounding Rule

The desired share count is derived from the desired share value and current
proxy price. The actual share count is rounded to the nearest board lot.

<<r:margin-leverage-target>>

`roundingCashBalance` records the difference between the desired share value and
the rounded share value. It can be negative when rounding buys slightly more
than the desired share value, or positive when rounding buys less.

## Distribution Cash

Distribution cash is tracked separately while it is available for HELOC
interest. The reported `cashBalance` combines leftover distribution cash and
rounding cash.

A negative cash balance in this simulator is not a broker cash loan model. It
is an accounting trace of board-lot rounding around the target share value.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that rebalancing trades are
rounded to the nearest 100-share board lot and that rounding cash does not
accumulate below half a board lot in the negative direction.
