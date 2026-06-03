---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Tax Deduction Column

## What

The tax deduction column is a simple tracking field. It is not a tax return and
not a full tax engine.

## Why

Interest and distributions both matter to after-tax interpretation, but the
current Svelte simulator does not model full Canadian tax filing rules. The
column gives a narrow net-interest indicator without pretending to solve all
tax questions.

## How

At each monthly checkpoint, the simulator records:

```text
taxDeduction = interestOwing - distributionsPaid
```

Why distributions are subtracted: the current tracking column treats
distribution cash as offsetting the interest burden for that checkpoint.

<tax-deduction-demo></tax-deduction-demo>

## Limits

The column does not model marginal tax brackets, eligible dividend gross-up,
foreign income treatment, capital gains, superficial loss rules, alternative
minimum tax, Ontario credits, or filing mechanics.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates the current formula in the
distribution fixture by checking that `taxDeduction` equals interest owing less
distributions paid.
