# Tax Deduction Column

The tax deduction column is a tracking field, not a full tax engine.

## Current Formula

At each monthly checkpoint, the simulator records:

```text
taxDeduction = interestOwing - distributionsPaid
```

`interestOwing` is margin interest plus HELOC interest. `distributionsPaid` is
the accumulated distribution cash for that checkpoint.

The value can be negative when distributions exceed interest for the checkpoint.
That does not mean the investor receives a negative tax bill. It only means the
tracking column's simple net-interest measure is negative for that row.

## What It Does Not Model

The column does not model marginal tax brackets, eligible dividend gross-up,
foreign income treatment, capital gains, superficial loss rules, alternative
minimum tax, Ontario credits, or filing mechanics. The Python scaffold has a
separate table-driven tax-engine direction, but the current Svelte simulator
does not use that engine.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates the current formula in the
distribution fixture by checking that `taxDeduction` equals interest owing less
distributions paid.
