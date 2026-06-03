---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Board Lots and Cash Balance

## What

A board lot is a standard trading block. This simulator rounds rebalanced share
holdings to 100-share board lots.

## Why

Rounding matters because the desired leverage target usually produces a
fractional or non-board-lot share count. If the model ignored rounding, it would
make trades that the chosen rule does not allow.

## How

The simulator computes desired shares from desired share value, then rounds to
the nearest board lot. The difference becomes rounding cash.

<<r:margin-leverage-target>>

Why cash can be negative: if rounding buys slightly more than the exact target,
the rounded share value is larger than desired share value. The cash field
records that difference so total assets still reconcile.

<leverage-board-lot-demo></leverage-board-lot-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates board-lot rounding and checks
that negative rounding cash does not accumulate beyond half a board lot.
