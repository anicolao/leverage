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

## Price Proxy

The price proxy gives the simulator a share-price-like series. The monthly
simulator buys shares, sells shares, and computes margin leverage from share
value, which a total-return index cannot support because it already reinvests
distributions. Production code indexes each CAD component close to its first
available CAD close, applies the weights, carries distributions in the same
indexed space, and applies the expense ratio.

<<r:synthetic-xaw-price>>

<synthetic-xaw-demo></synthetic-xaw-demo>

## Validation Artifact

`src/lib/backtest/xaw.test.ts` validates that TypeScript synthetic values match
the Python fixture implementation, that pre-inception rows can be scaled to the
XAW inception anchor, and that missing component dates are fill-forwarded
instead of dropping a component's portfolio weight.
