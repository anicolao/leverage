# Leveraged Smith Manoeuvre Backtester Design

This repository scaffolds a historical backtester for a leveraged Canadian
portfolio using a Home Equity Line of Credit (HELOC), broker margin, Canadian
eligible dividends, foreign distributions, and ACB-aware realized gains.

It is a simulation scaffold, not tax advice. The tax engine is intentionally
table-driven because a 2006-present Ontario simulation needs historical
federal, Ontario, surtax, credit, and health-premium inputs for each year.

## Core Flow

The backtester runs on a daily calendar:

1. Fetch and align market data for `XDV.TO` and synthetic/actual `XAW.TO`.
2. Initialize the portfolio with `$2,000,000` of HELOC debt and `$500,000` of
   margin debt, then buy 75% `XDV.TO` and 25% `XAW.TO`.
3. On each date, receive cash distributions.
4. Accrue HELOC and margin interest using the applicable annual rates.
5. Use dividend cash to pay interest.
6. Capitalize any interest shortfall onto the HELOC, subject to the
   `$4,000,000` hard cap.
7. If the margin debt / portfolio value ratio rises above 25%, draw HELOC
   capacity and buy `XAW.TO` until the ratio is restored to 20%.
8. If the HELOC is capped and leverage cannot be restored, sell assets and pay
   down margin debt, tracking realized gains through ACB.
9. At year end, calculate taxable regular income, eligible dividend gross-up,
   dividend tax credits, interest deductions, and taxable capital gains.

## Classes

### `DataFetcher`

`leverage_backtester.data.DataFetcher` owns all yfinance access and data
normalization.

Responsibilities:

- Download daily `Close` and `Dividends` data.
- Build pre-launch synthetic `XAW.TO` history from `SPY`, `EFA`, and `EEM`.
- Convert US ETF prices and distributions to CAD using `CAD=X`.
- Construct a weighted CAD total-return proxy from 2006 through
  2015-02-09.
- Scale and splice the synthetic series into actual `XAW.TO` history starting
  on 2015-02-10.
- Return aligned price and dividend matrices for the simulator.

The synthetic proxy weights are:

- `SPY`: 55%
- `EFA`: 35%
- `EEM`: 10%

### `Portfolio`

`leverage_backtester.portfolio.Portfolio` owns state transitions.

Responsibilities:

- Track share quantities, cash, ACB, HELOC debt, and margin debt.
- Buy and sell assets with ACB-aware realized gain calculation.
- Receive distributions.
- Accrue and service interest.
- Capitalize interest shortfalls onto the HELOC.
- Draw HELOC capacity for average-down purchases.
- Sell assets to reduce margin debt if the HELOC cap prevents rebalancing.

### `RateProvider`

`leverage_backtester.rates.RateProvider` abstracts interest-rate data.

Responsibilities:

- Return annualized HELOC and margin rates by date.
- Support fixed rates for smoke tests and CSV-backed historical rates for
  production runs.

Expected CSV format:

```csv
date,rate
2006-01-03,0.0525
```

### `TaxEngine`

`leverage_backtester.tax.TaxEngine` calculates annual Ontario tax outcomes.

Responsibilities:

- Track eligible dividends from `XDV.TO`.
- Track foreign income from `XAW.TO`.
- Track deductible investment interest.
- Track capital gains and apply a 50% inclusion rate.
- Apply eligible-dividend gross-up and non-refundable federal/Ontario dividend
  tax credits.
- Apply progressive federal and Ontario brackets supplied by
  `TaxYearConfig`.

The default config is a simplified 2025 Ontario/Federal table suitable for
development only. A production-grade historical run should load annual
bracket, surtax, credit, Ontario health premium, and minimum-tax data from
source-controlled CSV files.

## Source References

- CRA confirms foreign dividends do not qualify for the Canadian dividend tax
  credit and eligible dividends are claimed through federal/provincial dividend
  tax credit lines:
  https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40425-federal-dividend-tax-credit.html
- CRA describes the 38% eligible-dividend gross-up and federal DTC mechanics:
  https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/federal-government-budgets/budget-2013/budget-2013-dividend-tax-credit.html
- Ontario publishes the Ontario dividend tax credit framework:
  https://www.ontario.ca/page/ontario-dividend-tax-credit

## Extensibility

The current scaffold separates market data, portfolio mechanics, rates, and tax
rules. The intended next production step is to replace the default tax/rate
tables with versioned historical CSVs and add regression fixtures around known
periods such as 2008-2009, March 2020, and 2022.
