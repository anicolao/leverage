---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Outcome Histograms

The outcome histogram shows final equity across sampled historical start dates
for a fixed horizon.

## Start-Date Sensitivity

Start-date luck matters in leveraged investing. Two investors can use the same
rules and get different outcomes if one begins before a crisis and the other
begins after it.

## Sampled Start Dates

The app samples a centered window of historical start dates around the selected
start date.

<<r:equity-outcome-start-dates>>

The window clamps near the beginning or end of the data because there are not
enough dates on both sides of the selected start.

## Complete Outcomes

For each complete start date, the simulator reruns the same scenario and stores
final equity.

<<r:equity-outcome-histogram>>

Incomplete starts are excluded because a 10-year outcome should not be compared
with a 3-year outcome just because the data ended.

## Cumulative Buckets

Buckets are cumulative lower-bound buckets.

<<r:equity-outcome-buckets>>

Cumulative buckets answer direct questions such as "what percentage of sampled
starts ended with at least `$300,000` of equity?"

<outcome-histogram-demo></outcome-histogram-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates centered windows, edge
clamps, complete-horizon filtering, fixed horizon day counts, cumulative bucket
monotonicity, and percentile placement.
