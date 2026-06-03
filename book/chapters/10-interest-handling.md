# Interest Handling

The simulator tracks margin interest and HELOC interest separately because they
are paid differently.

## Accrual

Margin interest accrues on margin debt at prime less 95 basis points. HELOC
interest accrues on HELOC debt at prime.

<<r:monthly-interest-accrual>>

## Margin Interest

At each monthly checkpoint, margin interest follows the selected capitalization
policy:

<<r:capitalization-policy>>

The policies are:

- `always`: add margin interest to HELOC debt.
- `never`: sell shares to pay margin interest when shares are available.
- `negativeEquity`: capitalize only when equity before interest is negative.
- `movingAverage`: capitalize when current price is at or below the 120-day
  moving average.

The payment and capitalization mechanics are:

<<r:monthly-interest-handling>>

If shares are insufficient to pay all margin interest under a non-capitalizing
policy, the remaining margin interest is capitalized to HELOC debt.

## HELOC Interest

HELOC interest is paid from distribution cash first. Any remaining HELOC
interest is paid by selling shares. HELOC interest is not capitalized by the
current simulator.

## Validation Artifact

`src/lib/backtest/dcaSimulator.test.ts` validates all four capitalization
policies, the prime-minus-95-basis-points margin rate, and the rule that
distributions are used before share sales to pay HELOC interest.
