---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Synthetic XAW Proxy

`XAW.TO` is an exchange-traded fund, or ETF, that holds global equities outside
Canada. The simulator wants a longer history than real XAW provides, so it
builds a synthetic proxy for the years before XAW existed.

The proxy is a model assumption, not measured pre-inception XAW history.

## Why The Proxy Exists

The strategy's risks show up in old stress windows such as 2008-2009. Without a
pre-inception proxy, the simulator would miss those years. The cost of using a
proxy is that the reader must understand how it is built and where it can be
wrong.

## Proxy Weights

The proxy combines three US-listed ETFs and converts their values to Canadian
dollars using `CAD=X`.

<<r:synthetic-xaw-default-weights>>

`SPY` represents US equities, `EFA` represents developed markets outside North
America, and `EEM` represents emerging markets. The weights matter because they
define the exposure mix before actual XAW data exists.

## Total Return Proxy

The total-return proxy estimates growth with distributions reinvested. This is
the cleanest validation view because actual XAW total return and synthetic total
return can be compared over the overlap period. Production code aligns dates,
converts each component to CAD, builds each component total-return index,
applies weights, tracks distributions, and applies the expense ratio.

<<r:synthetic-xaw-total-return>>

The example below uses stored Yahoo Finance rows for 2023, when actual
`XAW.TO`, `SPY`, `EFA`, `EEM`, and `CAD=X` data all exist. It is intentionally
an overlap-window example rather than a toy fixture: the chart shows the full
year, and the table shows the first 15 comparable trading days so the reader
can inspect actual XAW values beside the synthetic values computed by the same
production helpers.

<synthetic-xaw-demo></synthetic-xaw-demo>

## Price Proxy

The price proxy gives the simulator a share-price-like series. The monthly
simulator buys shares, sells shares, and computes margin leverage from share
value, which a total-return index cannot support because it already reinvests
distributions. Production code indexes each CAD component close to its first
available CAD close, applies the weights, carries distributions in the same
indexed space, and applies the expense ratio.

<<r:synthetic-xaw-price>>

## Validation Artifact

`tests/fixtures/market-overlap-2023.json` stores the real overlap rows used by
the example. `book/examples/examples.test.ts` checks that the fixture contains
enough actual XAW rows and that the computed comparison has high overlap and
correlation. `src/lib/backtest/xaw.test.ts` still validates the lower-level
proxy mechanics against the Python fixture implementation, the XAW inception
anchor scaling rule, and fill-forward behavior for missing component dates.
