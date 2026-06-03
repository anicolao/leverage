---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Tax Deduction Column

The tax deduction column is a simple tracking field. It is not a tax return and
not a full tax engine. The simulator includes it because interest and
distributions affect the way a leveraged account is interpreted after tax, but
the app should not pretend that a single table column can model Canadian tax
filing mechanics.

## A Narrow Tax Indicator

Interest and distributions both matter to after-tax interpretation, but the
current Svelte simulator does not model full Canadian tax filing rules. The
column gives a narrow net-interest indicator without pretending to solve all
tax questions.

## Current Formula

At each monthly checkpoint, the simulator records:

```text
taxDeduction = interestOwing - distributionsPaid
```

Distributions are subtracted because the current tracking column treats
distribution cash as offsetting the interest burden for that checkpoint.

<tax-deduction-demo></tax-deduction-demo>

The graph uses actual dividend events from the stored 2023 `XAW.TO` fixture.
That matters because the tax column only becomes interesting when a checkpoint
contains both borrowing cost and distribution cash; invented distributions can
show the formula, but real events show when the production data actually
changes the value.

## Limits

The column does not model marginal tax brackets, eligible dividend gross-up,
foreign income treatment, capital gains, superficial loss rules, alternative
minimum tax, Ontario credits, or filing mechanics.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates the current formula in the
distribution fixture by checking that `taxDeduction` equals interest owing less
distributions paid.
