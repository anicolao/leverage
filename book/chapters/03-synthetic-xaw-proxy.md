---
{
  "modules": ["./book/components/BookExamples"]
}
---

# The Synthetic XAW Proxy

## What

`XAW.TO` is an exchange-traded fund, or ETF, that holds global equities outside
Canada. The simulator wants a longer history than real XAW provides, so it
builds a synthetic proxy for the years before XAW existed.

The proxy is a model assumption, not measured pre-inception XAW history.

## Why

The strategy's risks show up in old stress windows such as 2008-2009. Without a
pre-inception proxy, the simulator would miss those years. The cost of using a
proxy is that the reader must understand how it is built and where it can be
wrong.

## How: Weights

The proxy combines three US-listed ETFs and converts their values to Canadian
dollars using `CAD=X`.

<<r:synthetic-xaw-default-weights>>

`SPY` represents US equities, `EFA` represents developed markets outside North
America, and `EEM` represents emerging markets. The weights matter because they
define the exposure mix before actual XAW data exists.

## How: Total Return

What: the total-return proxy estimates growth with distributions reinvested.

Why: total return is the cleanest validation view because actual XAW total
return and synthetic total return can be compared over the overlap period.

How: production code aligns dates, converts each component to CAD, builds each
component total-return index, applies weights, tracks distributions, and applies
the expense ratio.

<<r:synthetic-xaw-total-return>>

## How: Price

What: the price proxy gives the simulator a share-price-like series.

Why: the monthly simulator buys shares, sells shares, and computes margin
leverage from share value. A total-return index cannot do that because it
already reinvests distributions.

How: production code indexes each CAD component close to its first available
CAD close, applies the weights, carries distributions in the same indexed
space, and applies the expense ratio.

<<r:synthetic-xaw-price>>

<synthetic-xaw-demo></synthetic-xaw-demo>

## Validation Artifact

`src/lib/backtest/xaw.test.ts` validates that TypeScript synthetic values match
the Python fixture implementation, that pre-inception rows can be scaled to the
XAW inception anchor, and that missing component dates are fill-forwarded
instead of dropping a component's portfolio weight.
