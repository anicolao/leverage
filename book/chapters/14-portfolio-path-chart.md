---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Portfolio Path Chart

The portfolio path chart shows assets, debt, equity, and proxy price through
the selected simulation.

## Path Dependence

Leveraged strategies are path-dependent. A final positive result can still hide
a period where the account nearly hit a margin call or exhausted HELOC
capacity.

## Chart Inputs

The chart reads the same monthly checkpoint rows as the table and summary
tiles. Those rows are recorded after the monthly mechanics have already run.

<<r:checkpoint-row>>

The chart has two axes because assets, debt, and equity are portfolio-dollar
values, while proxy price is a per-share value.

<monthly-step-demo></monthly-step-demo>

## Reading The Chart

If assets and debt both rise, equity may still be weak when debt rises faster.
If proxy price falls while debt remains high, margin-call drawdown and forced
sale risk become more important than the average return.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates the row fields used by the
chart: assets, debt, equity, leverage, cash balance, and drawdown metrics.
