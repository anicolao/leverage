# Reading Bad Outcomes

## What

A bad outcome is not only a low final return. In a leveraged strategy, bad
outcomes include negative equity, forced sales, exhausted HELOC capacity, and
near-margin-call conditions.

## Why

Those states matter because they can remove the investor's ability to hold
through a downturn. The strategy can fail before the market recovers if debt
pressure forces sales at low prices.

## How: Negative Equity

Negative equity means total debt exceeds tracked assets:

```text
equity = totalAssets - totalDebt
```

Why this matters: the investor may still own shares, but debt holders have a
larger claim than the assets are currently worth.

## How: Forced Sales

The simulator records three forced-sale paths:

- `interestPaidBySale`: shares sold to pay margin interest.
- `helocInterestPaidBySale`: shares sold to pay HELOC interest after
  distributions are exhausted.
- `helocLimitPaidBySale`: shares sold to bring HELOC debt back under the cap.

Why this matters: forced sales reduce share count, so the portfolio has fewer
shares available for a later rebound.

## How: HELOC Exhaustion

`remainingHelocCapacity` falling to zero means the configured HELOC cap is fully
used. Why this matters: the model has less room to absorb contributions,
capitalized interest, or support for the margin account.

## How: Margin-Call Proximity

`marginCallDrawdown` near zero means a small share-price decline would reach the
simplified maintenance-margin threshold. Why this matters: a tiny additional
drop could force action when prices are already low.

## Stress Windows To Critique

Useful windows in the current data include 2008-2009, March 2020, 2022, and
recent high-rate history. Why these windows matter: they combine falling prices,
fast drawdowns, or high borrowing costs, which are the conditions where this
strategy is most fragile.

## Validation Artifact

The bad-outcome fields are validated indirectly by the simulator fixtures for
HELOC cap enforcement, interest sales, distribution-first HELOC interest
payment, drawdown calculation, and equity accounting.
