# HELOC Cap Enforcement

The HELOC cap answers: what happens if contributions or capitalized margin
interest push HELOC debt above the configured maximum?

## Enforcement Rule

After contribution and margin rebalancing, the simulator checks HELOC debt
against `maxHelocDebt`.

<<r:heloc-cap-enforcement>>

The overage is paid down by selling shares at the current proxy price. The sale
is limited by available share value, so a severely depleted portfolio may still
be unable to eliminate all debt pressure through share sales.

## Effects On The Row

HELOC cap enforcement lowers share count and HELOC debt. It does not directly
change margin debt in this implementation. The forced-sale amount is recorded
as `helocLimitPaidBySale`, making cap pressure visible in the checkpoint table.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that share sales keep HELOC
debt at or below the configured maximum in the direct cap-enforcement fixture.
