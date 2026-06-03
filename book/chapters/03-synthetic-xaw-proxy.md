# The Synthetic XAW Proxy

`XAW.TO` launched after the simulator's desired start date, so the app builds a
pre-inception proxy and then scales it into actual XAW share-price space once
real XAW data exists.

The proxy is a model assumption. It is not measured XAW history before
inception.

## Inputs

The production proxy uses three US-listed ETFs plus the CAD/USD exchange-rate
series:

<<r:synthetic-xaw-default-weights>>

`SPY` represents US equities, `EFA` represents developed markets outside North
America, and `EEM` represents emerging markets. Each US ETF close and
distribution is converted to CAD with `CAD=X`.

## Total Return Construction

The total-return proxy answers: how would a weighted CAD basket have grown if
distributions were reinvested and the current XAW MER were applied?

<<r:synthetic-xaw-total-return>>

The function aligns the component calendar, converts component values to CAD,
builds each component total-return index, weights those indexes, tracks the
weighted distributions, and applies the annual expense ratio.

## Price Construction

The simulator itself needs a price-like series with distributions attached,
because monthly checkpoints buy and sell shares.

<<r:synthetic-xaw-price>>

The price proxy indexes each CAD component close to its first available CAD
close, applies the same weights, carries distributions in the same indexed
space, and applies the annual expense ratio. The server later scales that proxy
to actual `XAW.TO` at the first actual XAW close.

## Splice And Validation

For validation charts, the app compares synthetic and actual XAW only over the
period where actual XAW exists. For simulation, it includes pre-inception proxy
rows and scales them to the XAW inception anchor.

`src/lib/backtest/xaw.test.ts` validates three important claims:

- TypeScript synthetic values match the Python fixture implementation.
- Pre-inception synthetic rows can be scaled to the XAW inception anchor.
- Missing component dates are fill-forwarded instead of dropping that
  component's portfolio weight.

Those tests do not prove the proxy is economically perfect. They prove that the
book, app, and fixture implementation agree on the proxy mechanics currently in
the repository.
