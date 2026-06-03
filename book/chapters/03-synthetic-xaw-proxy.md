---
{
  "modules": ["./book/components/BookExamples"]
}
---

# Single-Ticker ETF Proxies

The simulator can now run the same leveraged dollar-cost averaging strategy
against several Canadian-listed exchange-traded funds, or ETFs. A
Canadian-listed ETF trades in Canadian dollars on the Toronto Stock Exchange,
which matters because the simulator computes share purchases, margin debt, and
HELOC debt in Canadian dollars.

Each selected ETF has real Yahoo Finance price and distribution rows only after
its inception date. The simulator wants to test stress windows before those
funds existed, so it builds a synthetic proxy for the earlier years and scales
that proxy into the selected ETF's share-price space at the first actual close.
The proxy is a model assumption, not measured pre-inception fund history.

## Why The Proxy Exists

The strategy's risks show up in old stress windows such as 2008-2009. Without a
pre-inception proxy, the simulator would miss those years, which would make a
leveraged strategy look safer than it really is. The cost of using a proxy is
that the reader must understand how it is built and where it can be wrong.

## Strategy Choices

The production configuration defines the ETF choices, their actual Yahoo
tickers, their inception dates, and the proxy weights used before actual data
exists. The inception date matters because validation can only start once the
real ETF has traded. The weights matter because they define the market exposure
used in earlier history.

<<r:single-ticker-strategies>>

<strategy-config-demo></strategy-config-demo>

`SPY` represents US equities, `EFA` represents developed markets outside North
America, `EEM` represents emerging markets, and `XIU.TO` represents Canadian
large-cap equities. The US-listed proxy components trade in US dollars, so the
simulator converts them to Canadian dollars with `CAD=X`. The Canadian-listed
`XIU.TO` component already trades in Canadian dollars, so converting it again
would overstate or understate Canadian exposure whenever the exchange rate
moved.

## Total Return Proxy

The total-return proxy estimates growth with distributions reinvested. This is
the cleanest validation view because actual ETF total return and synthetic total
return can be compared over the overlap period. Production code aligns dates,
converts each component to CAD when needed, builds each component total-return
index, applies weights, tracks distributions, and applies the expense ratio.

<<r:synthetic-xaw-total-return>>

The example below uses stored Yahoo Finance rows for 2023, when actual
`XAW.TO`, `SPY`, `EFA`, `EEM`, and `CAD=X` data all exist. XAW remains the
fixture example because the stored real-data overlap currently covers XAW. It
is intentionally an overlap-window example rather than a toy fixture: the chart
shows the full year, and the table shows the first 15 comparable trading days
so the reader can inspect actual XAW values beside the synthetic values
computed by the same production helpers.

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

`tests/fixtures/market-overlap-2023.json` stores the real XAW overlap rows used
by the example. `book/examples/examples.test.ts` checks that the fixture
contains enough actual XAW rows and that the computed comparison has high
overlap and correlation. `src/lib/backtest/xaw.test.ts` still validates the
lower-level proxy mechanics against the Python fixture implementation, the XAW
inception anchor scaling rule, fill-forward behavior for missing component
dates, normalized strategy weights, and the rule that Canadian-listed proxy
components are not converted through `CAD=X`.
