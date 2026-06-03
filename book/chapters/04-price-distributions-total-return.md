# Price, Distributions, and Total Return

The app separates three related views of the same market history: raw price,
cash distributions, and total return. Keeping them separate matters because the
simulator buys and sells shares using price, but interest handling and tax
tracking also need distribution cash.

## Price

Price is the daily close with distributions excluded. It answers: what share
price does the simulator use when it buys, sells, values holdings, and computes
margin leverage?

The synthetic price proxy is not a total-return index. It is an indexed CAD
component-price basket scaled into XAW share-price space at actual XAW
inception.

## Distributions

Distributions are cash paid per share. They answer: how much cash does the
portfolio receive before paying HELOC interest?

For the distribution chart, daily distributions are aggregated by calendar year:

<<r:annual-distributions>>

The known limitation is that synthetic distributions are less precise than
synthetic price movement. The proxy estimates component distributions after CAD
conversion and calibrated distribution drag; it does not recreate the exact
future XAW fund distribution policy before XAW existed.

## Total Return

Total return answers: how would a starting amount have grown if distributions
were reinvested?

<<r:total-return-index>>

The daily return combines price movement and cash distribution yield:
`row.close / previous.close - 1 + row.dividends / previous.close`.

The total-return chart is useful for validating the synthetic proxy against
actual XAW over their overlap. The monthly simulator does not buy the
total-return index; it uses the price-like series and receives distributions as
cash.

## Validation Artifact

`src/lib/backtest/xaw.test.ts` validates this chapter's mechanics with focused
examples:

- `totalReturnIndex` includes both price movement and distributions.
- `annualDistributions` aggregates daily cash distributions by calendar year.
- Synthetic and actual comparison fixtures continue to agree with the Python
  implementation used as a parity check.
