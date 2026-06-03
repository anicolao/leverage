---
{
  "modules": ["./book/components/BookExamples"]
}
---

# HELOC Cap Enforcement

The HELOC cap is the maximum HELOC debt allowed by the scenario. The simulator
enforces it because borrowing room is finite; without the cap, the model could
hide the point where the strategy stops being able to absorb contributions or
capitalized interest through additional HELOC debt.

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

The chart plots HELOC debt against the configured cap on real `XAW.TO`
checkpoints. When debt would exceed the cap, the simulator sells enough shares
at the current checkpoint price to bring HELOC debt back down, which is why the
debt line does not cross the cap line.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates that share sales keep HELOC
debt at or below the configured maximum in the direct cap fixture.
