---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Checkpoint Table

The checkpoint table shows the exact state recorded after each monthly
checkpoint.

## Audit Trail

Charts show patterns, but tables support audit work. If a reader wants to know
which month caused a forced sale or how much interest was capitalized, the table
is the source.

## Recorded Rows

Each table row is a `DcaSimulationRow`, recorded after all monthly mechanics
are applied.

<<r:checkpoint-row>>

## Interval Summaries

The table can display monthly, quarterly, or annual intervals.

<<r:summarize-simulation-rows>>

Summaries keep the last state but sum flows because shares, assets, debt, and
equity are ending states, while contributions, interest, distributions, and
sales are period flows.

<checkpoint-summary-demo></checkpoint-summary-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates quarterly and annual
summaries, including monthly contribution cadence and summed flow fields.
