# How To Read The Interface

The app is organized as a validation section followed by a simulator section.
Read it from top to bottom when you want to understand the current model, and
read it from the controls outward when you want to compare scenarios.

## Validation Summary

The opening tiles answer: how closely does the synthetic XAW proxy track real
`XAW.TO` over the overlap period?

Overlap is the count of comparable actual and synthetic daily rows.
Correlation describes directional agreement. Mean absolute error describes the
average absolute percentage difference. Distribution drag is the calibrated
synthetic distribution adjustment used by the current data builder.

## Comparison Charts

The chart tabs answer: where does the proxy agree or disagree with actual XAW
price, return, and distributions?

Total return shows growth of `$100` with distributions included. Price action
shows close prices with distributions excluded. Dividends shows annual cash
distributions in XAW share-price space. The data table below the chart is the
same comparison series rendered as rows.

## Simulation Controls

The simulator controls answer: which assumptions define the monthly borrowing,
investing, interest, and outcome horizon?

Start date selects the first simulation date. Investment target is the maximum
cumulative HELOC-funded contribution. Monthly investment is the contribution
attempted at each monthly checkpoint until the target is reached. Max HELOC debt
is the hard HELOC cap. Leverage target is broker margin debt as a percentage of
brokerage share value. Capitalize interest selects the policy for margin
interest that is not paid by selling shares. Table interval changes only row
presentation. Outcome horizon changes the fixed horizon used by the histogram.

## Portfolio Statistics

The summary tiles answer: what is the terminal portfolio state under the
selected scenario?

Final assets, cash balance, total debt, equity, margin leverage, HELOC
capacity, drawdown metrics, total interest, distributions, tax deduction, and
latest rates are all derived from the monthly simulation rows. They summarize
the last row or totals across rows; they do not run a separate calculation.

## Portfolio Path Chart

The portfolio path chart answers: how do assets, debt, equity, and proxy price
evolve through the simulation?

The left axis is money: assets, total debt, and equity. The right axis is proxy
price. Hovering the chart shows the monthly checkpoint row for the selected
date.

## Checkpoint Table

The checkpoint table answers: what exact state did the simulator record after
each checkpoint?

Each row is a `DcaSimulationRow`. Monthly, quarterly, and annual intervals are
presentation summaries. The simulator still contributes and rebalances at the
first trading date of each month.

## Outcome Histogram

The outcome histogram answers: how do fixed-horizon final equity outcomes vary
across sampled historical start dates?

For the selected start date, the app samples nearby historical starts, filters
out starts that do not have a complete horizon, runs the same simulator for
each remaining start, and buckets final equity cumulatively. A bucket labelled
`>= $100,000` means the percentage of sampled starts whose final equity was at
least `$100,000`.

## Validation Artifact

`book/examples/interface-inventory.ts` is the chapter inventory. It names each
interface section, the question it answers, and the test or fixture that keeps
the section grounded. `book/examples/examples.test.ts` verifies that every
listed section has a question and validation artifact.
