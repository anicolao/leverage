from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd
import yfinance as yf


@dataclass(frozen=True)
class MarketData:
    """Aligned market data used by the simulator."""

    prices: pd.DataFrame
    dividends: pd.DataFrame


@dataclass(frozen=True)
class DataFetcher:
    start: str = "2006-01-01"
    end: str | None = None
    splice_date: str = "2015-02-10"
    synthetic_weights: dict[str, float] = field(
        default_factory=lambda: {"SPY": 0.55, "EFA": 0.35, "EEM": 0.10}
    )

    def fetch(self) -> MarketData:
        """Fetch XDV and synthetic/actual XAW data aligned on one calendar."""

        xdv = self._download_symbol("XDV.TO", self.start, self.end)
        xaw = self._build_xaw_history()

        prices = pd.concat(
            {"XDV.TO": xdv["close"], "XAW.TO": xaw["close"]}, axis=1
        ).sort_index()
        dividends = pd.concat(
            {"XDV.TO": xdv["dividends"], "XAW.TO": xaw["dividends"]}, axis=1
        ).sort_index()

        prices = prices.ffill().dropna(how="any")
        dividends = dividends.reindex(prices.index).fillna(0.0)

        return MarketData(prices=prices, dividends=dividends)

    def _build_xaw_history(self) -> pd.DataFrame:
        splice = pd.Timestamp(self.splice_date)
        actual = self._download_symbol("XAW.TO", self.splice_date, self.end)
        synthetic = self._synthetic_xaw_proxy()

        synthetic_pre = synthetic[synthetic.index < splice].copy()
        actual_post = actual[actual.index >= splice].copy()
        if synthetic_pre.empty:
            raise ValueError("Synthetic XAW proxy has no rows before splice date")
        if actual_post.empty:
            raise ValueError("Actual XAW.TO history has no rows at/after splice date")

        scale = actual_post["close"].iloc[0] / synthetic_pre["close"].iloc[-1]
        synthetic_pre.loc[:, ["close", "dividends"]] *= scale

        return pd.concat([synthetic_pre, actual_post]).sort_index()

    def _synthetic_xaw_proxy(self) -> pd.DataFrame:
        usdcad = self._download_symbol("CAD=X", self.start, self.end)["close"]
        total_return_parts: list[pd.Series] = []
        dividend_parts: list[pd.Series] = []

        for symbol, weight in self.synthetic_weights.items():
            frame = self._download_symbol(symbol, self.start, self.end)
            cad_close = frame["close"].mul(usdcad.reindex(frame.index).ffill())
            cad_dividends = frame["dividends"].mul(usdcad.reindex(frame.index).ffill())
            total_return_parts.append(weight * self._total_return_index(cad_close, cad_dividends))
            dividend_parts.append(weight * cad_dividends)

        close = pd.concat(total_return_parts, axis=1).sum(axis=1)
        dividends = pd.concat(dividend_parts, axis=1).sum(axis=1).reindex(close.index)
        return pd.DataFrame({"close": close, "dividends": dividends.fillna(0.0)})

    @staticmethod
    def _total_return_index(
        close: pd.Series, dividends: pd.Series, start_value: float = 100.0
    ) -> pd.Series:
        previous_close = close.shift(1)
        daily_return = close.div(previous_close).sub(1.0)
        daily_return = daily_return.add(dividends.div(previous_close), fill_value=0.0)
        daily_return.iloc[0] = 0.0
        return (1.0 + daily_return.fillna(0.0)).cumprod() * start_value

    @staticmethod
    def _download_symbol(
        symbol: str, start: str | date, end: str | date | None
    ) -> pd.DataFrame:
        history = yf.Ticker(symbol).history(
            start=start,
            end=end,
            auto_adjust=False,
            actions=True,
        )
        if history.empty:
            raise ValueError(f"No yfinance history returned for {symbol}")

        index = pd.to_datetime(history.index).tz_localize(None).normalize()
        close = history["Close"].rename("close")
        close.index = index
        dividends = history.get("Dividends", pd.Series(0.0, index=history.index))
        dividends = dividends.rename("dividends")
        dividends.index = index

        return pd.DataFrame({"close": close.astype(float), "dividends": dividends.astype(float)})
