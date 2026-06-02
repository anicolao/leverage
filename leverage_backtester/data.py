from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from collections.abc import Mapping

import pandas as pd
import yfinance as yf


@dataclass(frozen=True)
class MarketData:
    """Aligned market data used by the simulator."""

    prices: pd.DataFrame
    dividends: pd.DataFrame


@dataclass(frozen=True)
class RawSymbolData:
    close: pd.Series
    dividends: pd.Series

    @classmethod
    def from_rows(cls, rows: list[dict[str, float | str]]) -> "RawSymbolData":
        frame = pd.DataFrame(rows)
        if frame.empty:
            raise ValueError("Raw symbol data cannot be empty")
        frame["date"] = pd.to_datetime(frame["date"]).dt.tz_localize(None).dt.normalize()
        frame = frame.sort_values("date").set_index("date")
        return cls(
            close=frame["close"].astype(float),
            dividends=frame.get("dividends", pd.Series(0.0, index=frame.index)).astype(float),
        )


@dataclass(frozen=True)
class DataFetcher:
    start: str = "2006-01-01"
    end: str | None = None
    splice_date: str = "2015-02-10"
    xaw_mer: float = 0.0022
    distribution_tax_drag: float = 0.0
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
        raw = {
            symbol: RawSymbolData(
                close=(frame := self._download_symbol(symbol, self.start, self.end))["close"],
                dividends=frame["dividends"],
            )
            for symbol in self.synthetic_weights
        }
        usdcad = self._download_symbol("CAD=X", self.start, self.end)["close"]
        return build_synthetic_xaw_proxy(
            raw,
            usdcad,
            self.synthetic_weights,
            self.xaw_mer,
            self.distribution_tax_drag,
        )

    @staticmethod
    def _total_return_index(
        close: pd.Series, dividends: pd.Series, start_value: float = 100.0
    ) -> pd.Series:
        return total_return_index(close, dividends, start_value)

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


def build_synthetic_xaw_proxy(
    symbol_data: Mapping[str, RawSymbolData],
    usdcad_close: pd.Series,
    weights: Mapping[str, float] | None = None,
    annual_expense_ratio: float = 0.0022,
    distribution_tax_drag: float = 0.0,
) -> pd.DataFrame:
    weights = weights or {"SPY": 0.55, "EFA": 0.35, "EEM": 0.10}
    total_return_parts: list[pd.Series] = []
    dividend_parts: list[pd.Series] = []

    for symbol, weight in weights.items():
        frame = symbol_data[symbol]
        exchange_rate = usdcad_close.reindex(frame.close.index).ffill()
        cad_close = frame.close.mul(exchange_rate)
        cad_dividends = frame.dividends.mul(exchange_rate).mul(
            1.0 - distribution_tax_drag
        )
        total_return_parts.append(weight * total_return_index(cad_close, cad_dividends))
        dividend_parts.append(weight * cad_dividends)

    close = apply_annual_expense_ratio(
        pd.concat(total_return_parts, axis=1).sum(axis=1),
        annual_expense_ratio,
    )
    dividends = pd.concat(dividend_parts, axis=1).sum(axis=1).reindex(close.index)
    return pd.DataFrame({"close": close, "dividends": dividends.fillna(0.0)})


def total_return_index(
    close: pd.Series, dividends: pd.Series, start_value: float = 100.0
) -> pd.Series:
    previous_close = close.shift(1)
    daily_return = close.div(previous_close).sub(1.0)
    daily_return = daily_return.add(dividends.div(previous_close), fill_value=0.0)
    daily_return.iloc[0] = 0.0
    return (1.0 + daily_return.fillna(0.0)).cumprod() * start_value


def apply_annual_expense_ratio(
    series: pd.Series, annual_expense_ratio: float
) -> pd.Series:
    if annual_expense_ratio <= 0:
        return series.copy()

    adjusted = series.astype(float).copy()
    multiplier = 1.0
    previous_date = adjusted.index[0]

    for index in range(1, len(adjusted)):
        current_date = adjusted.index[index]
        days = max(0, (current_date - previous_date).days)
        multiplier *= (1.0 - annual_expense_ratio) ** (days / 365.25)
        adjusted.iloc[index] = adjusted.iloc[index] * multiplier
        previous_date = current_date

    return adjusted
