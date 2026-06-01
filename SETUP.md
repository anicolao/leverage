**Role & Objective**

You are an expert quantitative developer and Canadian tax strategist.
Your task is to draft a software design document and the core Python
scaffolding for a historical portfolio backtester. The backtester
will simulate a highly specific, leveraged "Smith Manoeuvre" style
investment architecture through the 2008 Global Financial Crisis
to the present day.

**Technical Environment**

* Language: Python 3

* Libraries: `pandas`, `numpy`, `yfinance` (for historical daily
data).

* Environment: Provide a `flake.nix` file and `.envrc` to manage 
and automatically use these dependencies.


**Data Handling & Proxies**

The simulation requires daily price and dividend data from 2006 to
present for two Canadian ETFs: `XAW.TO` (Global Equity) and `XDV.TO`
(Canadian Dividend). Because XAW.TO launched in 2015, the system
must build a synthetic price history for XAW from 2006-2015 using
a closely correlated global proxy before splicing into actual XAW 
data.

**Data Splicing & The 2008 Currency Reality**
`XAW.TO` did not exist in 2008, and no unhedged Canadian equivalent
existed either. To simulate XAW from 2006 to February 10, 2015, the
`DataFetcher` class must build a synthetic index.
1. Download daily data for `SPY` (55% weight), `EFA` (35% weight),
and `EEM` (10% weight).
2. Download daily USD/CAD exchange rates using the yfinance ticker
`CAD=X`.
3. Multiply the daily closing prices and dividends of the US ETFs
by the daily USD/CAD exchange rate to calculate the daily unhedged
CAD value.
4. Splice this synthetic CAD-denominated total return index seamlessly
into the actual `XAW.TO` data starting on February 10, 2015.

**Simulation Parameters & Mechanics**

The engine must step through time (monthly or daily) and apply the
following rules:

1. **Initial State:** Borrow $2M from a Home Equity Line of Credit
(HELOC). Borrow $500k from a broker margin account. Total cash to
invest: $2.5M.
2. **Asset Allocation:** Buy $1.875M of XDV.TO (75%) and $625k of
XAW.TO (25%).
3. **Debt Servicing:** Track two dynamic interest rates (Historical
Canadian Prime for the HELOC, Historical IBKR Blended Margin Rate).
The portfolio's natural dividend yield must pay down the interest
first.
4. **Capitalizing Interest:** If dividends do not cover the interest,
the shortfall is added to the HELOC balance (capitalizing the
interest). The HELOC has a hard ceiling of $4,000,000.
5. **Volatility Harvesting (The Rebalance Rule):** Continuously
monitor the margin account leverage ratio (Margin Debt / Total
Brokerage Portfolio Value). If the ratio exceeds 25% due to a market
crash, trigger an "Average Down" event: Draw funds from the available
HELOC capacity to buy XAW.TO until the margin leverage ratio is
restored exactly to 20%.


**Canadian Tax Calculation Module**

The simulation must calculate the annual tax outcome based on
Ontario, Canada tax brackets:
* **Section 20(1)(c) Deductibility:** 100% of the interest paid on
both the HELOC and Margin account is tax-deductible against investment
income. Track this deduction balance.
* **Dividends:** XDV distributions must be processed as Canadian
Eligible Dividends (apply the 38% gross-up and the non-refundable
Dividend Tax Credit). XAW distributions are fully taxable regular
foreign income.
* **Capital Gains:** Any forced sell-downs (if the HELOC caps out)
must calculate realized capital gains using a 50% inclusion rate
and track the Adjusted Cost Base (ACB).


**Output Requirements**
1. Write the architecture design document detailing the class
structures (e.g., `Portfolio`, `TaxEngine`, `DataFetcher`).
2. Provide the `flake.nix` file.
3. Write the core `simulate()` loop demonstrating the exact order
of operations (fetch prices -> receive dividends -> pay interest
-> check margin call / rebalance -> calculate taxes).
