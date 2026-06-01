from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import pandas as pd


class RateProvider(Protocol):
    def rate_for(self, day: pd.Timestamp) -> float:
        """Return an annualized decimal rate for the supplied date."""


@dataclass(frozen=True)
class FixedRateProvider:
    annual_rate: float

    def rate_for(self, day: pd.Timestamp) -> float:
        return self.annual_rate


@dataclass
class CsvRateProvider:
    path: str | Path

    def __post_init__(self) -> None:
        frame = pd.read_csv(self.path, parse_dates=["date"])
        if not {"date", "rate"}.issubset(frame.columns):
            raise ValueError("Rate CSV must contain date and rate columns")
        self._rates = (
            frame[["date", "rate"]]
            .sort_values("date")
            .set_index("date")["rate"]
            .astype(float)
        )

    def rate_for(self, day: pd.Timestamp) -> float:
        day = pd.Timestamp(day).normalize()
        eligible = self._rates.loc[self._rates.index <= day]
        if eligible.empty:
            raise ValueError(f"No rate available on or before {day.date()}")
        return float(eligible.iloc[-1])
