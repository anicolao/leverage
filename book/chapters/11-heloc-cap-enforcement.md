---
{
  "modules": ["./book/components/BookExamples"]
}
---

# HELOC Cap Enforcement

The HELOC cap is the maximum HELOC debt allowed by the scenario.

## Borrowing Room

Borrowing capacity is finite. If the simulator allowed unlimited HELOC debt, it
would hide the moment where the strategy runs out of room to absorb
contributions or capitalized interest.

## Cap Check

After contribution and margin rebalancing, the simulator checks whether HELOC
debt exceeds the cap. If it does, shares are sold and proceeds reduce HELOC
debt.

<<r:heloc-cap-enforcement>>

The cap is checked after rebalancing because the contribution and
margin-interest choices are what can push HELOC debt over the limit.

<heloc-cap-demo></heloc-cap-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that share sales keep HELOC
debt at or below the configured maximum in the direct cap fixture.
