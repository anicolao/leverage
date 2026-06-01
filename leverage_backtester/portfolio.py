from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd


@dataclass
class Position:
    shares: float = 0.0
    acb: float = 0.0

    def buy(self, dollars: float, price: float) -> None:
        if dollars <= 0:
            return
        self.shares += dollars / price
        self.acb += dollars

    def sell(self, dollars: float, price: float) -> float:
        if dollars <= 0 or self.shares <= 0:
            return 0.0
        shares_to_sell = min(self.shares, dollars / price)
        proceeds = shares_to_sell * price
        cost_base = self.acb * (shares_to_sell / self.shares)
        self.shares -= shares_to_sell
        self.acb -= cost_base
        return proceeds - cost_base

    def value(self, price: float) -> float:
        return self.shares * price


@dataclass(frozen=True)
class PortfolioConfig:
    initial_heloc_debt: float = 2_000_000.0
    initial_margin_debt: float = 500_000.0
    heloc_limit: float = 4_000_000.0
    target_margin_ratio: float = 0.20
    max_margin_ratio: float = 0.25
    xdv_weight: float = 0.75
    xaw_weight: float = 0.25


@dataclass
class Portfolio:
    config: PortfolioConfig = field(default_factory=PortfolioConfig)
    cash: float = 0.0
    heloc_debt: float = 0.0
    margin_debt: float = 0.0
    positions: dict[str, Position] = field(
        default_factory=lambda: {"XDV.TO": Position(), "XAW.TO": Position()}
    )

    @classmethod
    def initialize(
        cls, prices: pd.Series, config: PortfolioConfig | None = None
    ) -> "Portfolio":
        config = config or PortfolioConfig()
        portfolio = cls(config=config)
        portfolio.heloc_debt = config.initial_heloc_debt
        portfolio.margin_debt = config.initial_margin_debt
        investable_cash = config.initial_heloc_debt + config.initial_margin_debt
        portfolio.buy("XDV.TO", investable_cash * config.xdv_weight, prices["XDV.TO"])
        portfolio.buy("XAW.TO", investable_cash * config.xaw_weight, prices["XAW.TO"])
        return portfolio

    def buy(self, symbol: str, dollars: float, price: float) -> None:
        self.positions[symbol].buy(dollars, price)

    def sell(self, symbol: str, dollars: float, price: float) -> float:
        return self.positions[symbol].sell(dollars, price)

    def market_value(self, prices: pd.Series) -> float:
        return sum(position.value(prices[symbol]) for symbol, position in self.positions.items())

    def margin_ratio(self, prices: pd.Series) -> float:
        value = self.market_value(prices)
        if value <= 0:
            return float("inf")
        return self.margin_debt / value

    def receive_dividends(self, dividends_per_share: pd.Series) -> dict[str, float]:
        received: dict[str, float] = {}
        for symbol, position in self.positions.items():
            amount = position.shares * dividends_per_share.get(symbol, 0.0)
            received[symbol] = amount
            self.cash += amount
        return received

    def service_interest(self, heloc_rate: float, margin_rate: float) -> dict[str, float]:
        heloc_interest = self.heloc_debt * heloc_rate / 365.0
        margin_interest = self.margin_debt * margin_rate / 365.0
        total_interest = heloc_interest + margin_interest

        paid_from_cash = min(self.cash, total_interest)
        self.cash -= paid_from_cash
        shortfall = total_interest - paid_from_cash

        capitalized = min(shortfall, self.heloc_capacity)
        self.heloc_debt += capitalized
        unpaid = shortfall - capitalized

        return {
            "heloc_interest": heloc_interest,
            "margin_interest": margin_interest,
            "interest_accrued": total_interest,
            "interest_paid": paid_from_cash + capitalized,
            "interest_capitalized": capitalized,
            "unpaid_interest": unpaid,
        }

    @property
    def heloc_capacity(self) -> float:
        return max(0.0, self.config.heloc_limit - self.heloc_debt)

    def average_down_if_needed(self, prices: pd.Series) -> dict[str, float | str]:
        ratio = self.margin_ratio(prices)
        if ratio <= self.config.max_margin_ratio:
            return {"event": "", "draw": 0.0, "realized_gain": 0.0}

        value = self.market_value(prices)
        required_draw = (self.margin_debt / self.config.target_margin_ratio) - value
        draw = min(max(required_draw, 0.0), self.heloc_capacity)

        if draw > 0:
            self.heloc_debt += draw
            self.buy("XAW.TO", draw, prices["XAW.TO"])

        realized_gain = 0.0
        if self.margin_ratio(prices) > self.config.target_margin_ratio:
            realized_gain += self._sell_to_restore_margin(prices)

        return {"event": "average_down", "draw": draw, "realized_gain": realized_gain}

    def _sell_to_restore_margin(self, prices: pd.Series) -> float:
        value = self.market_value(prices)
        target = self.config.target_margin_ratio
        sell_amount = max(0.0, (self.margin_debt - target * value) / (1.0 - target))
        remaining = sell_amount
        realized_gain = 0.0

        for symbol in ("XAW.TO", "XDV.TO"):
            if remaining <= 0:
                break
            available = self.positions[symbol].value(prices[symbol])
            proceeds = min(remaining, available)
            realized_gain += self.sell(symbol, proceeds, prices[symbol])
            self.margin_debt -= proceeds
            remaining -= proceeds

        return realized_gain

    def snapshot(self, date: pd.Timestamp, prices: pd.Series) -> dict[str, float | pd.Timestamp]:
        return {
            "date": date,
            "portfolio_value": self.market_value(prices),
            "cash": self.cash,
            "heloc_debt": self.heloc_debt,
            "margin_debt": self.margin_debt,
            "margin_ratio": self.margin_ratio(prices),
            "xdv_shares": self.positions["XDV.TO"].shares,
            "xaw_shares": self.positions["XAW.TO"].shares,
            "xdv_acb": self.positions["XDV.TO"].acb,
            "xaw_acb": self.positions["XAW.TO"].acb,
        }
