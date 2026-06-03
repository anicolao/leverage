---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Interest Handling

Interest is the cost of borrowing. The simulator tracks margin interest and
HELOC interest separately because they are paid through different rules.

## Why Interest Can Force Sales

Interest can force share sales during downturns. That matters because selling
shares while prices are low reduces the number of shares available for a later
recovery.

## Accrual

Margin interest accrues on margin debt. HELOC interest accrues on HELOC debt.

<<r:monthly-interest-accrual>>

## Capitalization Policy

Capitalization means adding unpaid interest to debt instead of paying it in
cash. The current policy applies to margin interest.

<<r:capitalization-policy>>

Different investors may prefer to preserve shares during drawdowns or avoid
growing HELOC debt. The policy exposes that tradeoff instead of hiding it.

## Payment Mechanics

The simulator handles margin interest first, then HELOC interest. HELOC
interest uses distribution cash before selling shares.

<<r:monthly-interest-handling>>

Distributions are used first because cash can pay interest without reducing
share count, which avoids selling assets during market stress.

<interest-policy-demo></interest-policy-demo>

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates all four capitalization
policies, the prime-minus-95-basis-points margin rate, and distribution-first
HELOC interest payment.
