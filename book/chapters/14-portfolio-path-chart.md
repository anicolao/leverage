# The Portfolio Path Chart

The portfolio path chart answers: how do assets, debt, equity, and proxy price
move over the selected simulation?

## Series

The left axis shows money series:

- `totalAssets`
- `totalDebt`
- `equity`

The right axis shows the synthetic proxy price. Price is on a separate axis
because it is a per-share value, not a portfolio-dollar value.

## Source Rows

The chart is rendered from `simulationRows`, the same monthly checkpoint rows
used by the table and summary tiles. The accounting fields come from the
checkpoint row:

<<r:checkpoint-row>>

The hover callout displays the selected row's date, assets, total debt, equity,
cash, and proxy price.

## Reading The Chart

A rising asset line with a rising debt line can still produce weak equity if
debt grows faster than assets. A negative equity line means total debt exceeds
tracked assets. A falling proxy price line can produce forced sales or margin
stress depending on debt levels, cash balance, distributions, and remaining
HELOC capacity.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates the row-level fields used by
the chart: assets, total debt, equity, leverage, cash balance, and drawdown
metrics.
