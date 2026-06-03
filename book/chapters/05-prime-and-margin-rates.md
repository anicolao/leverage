---
{
  "modules": ["./book/components/InterestAccrualDemo"]
}
---

# Prime, Margin, and HELOC Interest

This pilot chapter covers the simulator's current interest-rate model. HELOC
interest uses the fill-forward Canadian prime rate. Margin interest uses the
same prime observation with a fixed discount of 95 basis points.

The chapter answers one focused question: given a prime rate, what annual
margin rate and daily simple interest does the simulator accrue?

## Production Code

The margin-rate conversion is production code from
`src/lib/backtest/dcaSimulator.ts`.

<<r:margin-rate-from-prime>>

The helper clamps the result at zero, so a very low prime rate cannot produce a
negative margin interest rate.

## Interactive Example

The calculator below imports the same `marginRateFromPrime` helper. HELOC
interest is shown beside margin interest so the discount is visible.

<interest-accrual-demo></interest-accrual-demo>

## Validation Artifact

The regression fixture in `book/examples/interest-fixture.ts` fixes the pilot's
baseline example:

- Prime rate: `4.45%`
- Margin discount: `0.95%`
- Expected margin rate: `3.50%`

`book/examples/examples.test.ts` and `src/lib/backtest/dcaSimulator.test.ts`
both assert that this mapping remains true.
