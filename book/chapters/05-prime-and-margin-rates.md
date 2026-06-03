---
{
  "modules": ["./book/components/InterestAccrualDemo"]
}
---

# Prime, Margin, and HELOC Interest

Prime is the Canadian prime lending rate series used by the simulator. HELOC
interest uses prime directly. Margin interest uses prime less 95 basis points.
A basis point is one hundredth of a percentage point, so 95 basis points is
`0.95%`.

## Borrowing Cost Risk

Borrowing cost is one of the main risks in a leveraged strategy. If interest
cost rises while share prices fall, the investor can be forced to sell shares
at exactly the wrong time.

The margin-rate discount exists because the current app models broker margin as
slightly cheaper than HELOC borrowing. The discount is an assumption, not a
universal brokerage rule.

## Margin Rate Helper

The production helper converts prime to the annual margin rate used by the
simulator.

<<r:margin-rate-from-prime>>

The `Math.max` clamp prevents the model from creating a negative interest rate
if prime is lower than the discount.

<interest-accrual-demo></interest-accrual-demo>

## Validation Artifact

`book/examples/interest-fixture.ts` fixes the baseline example: prime `4.45%`
maps to margin `3.50%`. `book/examples/examples.test.ts` and
`src/lib/backtest/dcaSimulator.test.ts` both assert that mapping.
