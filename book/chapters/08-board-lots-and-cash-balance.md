---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Board Lots and Cash Balance

A board lot is a standard trading block. This simulator rounds rebalanced share
holdings to 100-share board lots because the model intentionally represents a
coarse trading rule instead of allowing every rebalance to buy an exact
fractional share count. Rounding matters because the desired leverage target
usually lands between board lots; if the simulator ignored that, the reported
leverage would look cleaner than the trade rule actually permits.

## Rounding Cash

The simulator computes desired shares from desired share value, then rounds to
the nearest board lot. The difference becomes rounding cash.

<<r:margin-leverage-target>>

Cash can be negative when rounding buys slightly more than the exact target.
The rounded share value is then larger than desired share value, and the cash
field records that difference so total assets still reconcile.

<leverage-board-lot-demo></leverage-board-lot-demo>

The chart uses real 2023 `XAW.TO` monthly checkpoint prices. The selected
target stays fixed, while the actual leverage line moves around it because
100-share rounding converts a continuous target into discrete trades.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates board-lot rounding and checks
that negative rounding cash does not accumulate beyond half a board lot.
