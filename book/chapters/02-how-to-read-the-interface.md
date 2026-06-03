# How To Read The Interface

The interface is organized as a question-and-answer path. Each section asks one
question about the strategy, because leverage can look attractive in averages
while hiding the path-dependent moments where debt becomes dangerous.

## Validation Summary

What: the first tiles compare the synthetic XAW proxy against real `XAW.TO`
over the period where both exist.

Why: the simulator uses synthetic pre-inception history, so the reader needs
evidence that the proxy behaves reasonably once actual XAW data is available.

How: overlap counts comparable days, correlation measures directional
agreement, mean absolute error measures typical percentage difference, and
distribution drag shows the calibrated distribution adjustment.

## Comparison Charts

What: the chart tabs show total return, price action, and annual distributions.

Why: the simulator uses price to buy and sell shares, but it also needs
distribution cash for interest handling. A single chart would hide that
difference.

How: total return shows growth with distributions reinvested, price action
shows close prices without distributions, and dividends shows annual cash
distributions per share.

## Simulation Controls

What: the controls define the scenario: start date, investment target, HELOC
cap, monthly investment, leverage target, capitalization policy, table interval,
and outcome horizon.

Why: leveraged outcomes depend heavily on assumptions. A small change to debt,
interest policy, or start date can change whether the strategy survives a
drawdown.

How: changing a control updates the production simulator input and recomputes
the rows used by the summary tiles, chart, table, and histogram.

## Portfolio Statistics

What: the summary tiles show the terminal state and totals for the selected
scenario.

Why: the last row is where the investor sees whether the strategy ended with
positive equity, remaining HELOC capacity, manageable leverage, and tolerable
interest burden.

How: ending-state fields come from the last `DcaSimulationRow`; totals such as
interest and distributions are sums across all rows.

## Portfolio Path Chart

What: the path chart shows assets, debt, equity, and proxy price through time.

Why: leverage risk is path-dependent. The final result may look fine even if
the account came close to forced liquidation along the way.

How: the chart reads the same monthly checkpoint rows as the table and shows a
hover callout for the selected row.

## Checkpoint Table

What: the table shows the exact recorded monthly state.

Why: charts help with pattern recognition, but audits need exact numbers.

How: monthly rows are raw simulator checkpoints. Quarterly and annual views
summarize presentation only; they do not change the investment cadence.

## Outcome Histogram

What: the histogram shows fixed-horizon final equity across nearby historical
start dates.

Why: a leveraged strategy can be highly sensitive to when it starts. The
histogram makes start-date luck visible.

How: the app samples start dates near the selected date, filters out starts
without a complete horizon, runs the same simulator for each start, and reports
cumulative final-equity buckets.

## Validation Artifact

`book/examples/interface-inventory.ts` names each interface section, the
question it answers, and the fixture or test that keeps the section grounded.
