# Outcome Histograms

The outcome histogram answers: how sensitive are fixed-horizon final equity
outcomes to nearby historical start dates?

## Start-Date Window

The app samples a centered window of historical start dates around the selected
start date:

<<r:equity-outcome-start-dates>>

The window clamps to the beginning or end of available data when the selected
date is near an edge.

## Complete Horizons

The histogram excludes sampled starts that do not have enough data to complete
the selected horizon. A 10-year horizon therefore ignores starts near the end of
the available market history.

## Running Outcomes

For each complete start date, the simulator reruns the same scenario and stores
the final equity:

<<r:equity-outcome-histogram>>

The Svelte app performs this loop in chunks so the browser can update the
progress meter while outcomes are being calculated.

## Cumulative Buckets

Histogram buckets are cumulative lower-bound buckets:

<<r:equity-outcome-buckets>>

A row labelled `>= $300,000` means the share of complete sampled starts whose
final equity was at least `$300,000`. P25, P50, and P75 markers are assigned to
the bucket containing the corresponding percentile outcome.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates centered sample windows,
beginning clamps, complete-horizon filtering, fixed horizon day counts,
cumulative bucket monotonicity, and percentile placement.
