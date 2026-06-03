# Reading Bad Outcomes

Bad outcomes in this simulator usually come from the interaction of falling
prices, high debt, interest accrual, limited HELOC capacity, and forced sales.

## Negative Equity

Negative equity means total debt exceeds tracked assets:

```text
equity = totalAssets - totalDebt
```

It can happen even when the portfolio still owns shares. It is a solvency
measure in the simulator, not a declaration of bankruptcy or a lender action.

## Forced Sales

Forced sales appear in several columns:

- `interestPaidBySale`: shares sold to pay margin interest.
- `helocInterestPaidBySale`: shares sold to pay HELOC interest after
  distributions are exhausted.
- `helocLimitPaidBySale`: shares sold to bring HELOC debt back under the cap.

Forced sales can reduce future recovery because fewer shares remain for a later
price rebound.

## HELOC Exhaustion

`remainingHelocCapacity` falling to zero means the configured HELOC cap is
fully used. Once that happens, the model has less ability to absorb capitalized
interest, contributions, or cap pressure.

## Margin-Call Proximity

`marginCallDrawdown` near zero means a small share-price decline would reach the
simplified maintenance-margin threshold. `collapseDrawdown` includes remaining
HELOC capacity and should be read as a broader stress indicator.

## Stress Windows To Inspect

Useful critique windows in the current data include:

- 2008-2009 for a long crisis drawdown.
- March 2020 for a sharp crash and rebound.
- 2022 for falling global equities combined with rising rates.
- Recent high-rate history for interest burden after prime-rate increases.

The simulator does not claim these windows forecast future losses. They are
historical stress examples for understanding the implemented mechanics.

## Validation Artifact

The bad-outcome fields are validated indirectly by the same fixtures in
`src/lib/backtest/dcaSimulator.test.ts`: HELOC cap enforcement, interest sales,
distribution-first HELOC interest payment, drawdown calculation, and equity
accounting.
