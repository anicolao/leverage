from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from leverage_backtester.data import DataFetcher, MarketData
from leverage_backtester.portfolio import Portfolio, PortfolioConfig
from leverage_backtester.rates import FixedRateProvider, RateProvider
from leverage_backtester.tax import TaxEngine


@dataclass(frozen=True)
class SimulationConfig:
    start: str = "2006-01-01"
    end: str | None = None
    portfolio: PortfolioConfig = field(default_factory=PortfolioConfig)


@dataclass(frozen=True)
class SimulationResult:
    daily: pd.DataFrame
    annual_tax: pd.DataFrame


def simulate(
    config: SimulationConfig | None = None,
    data_fetcher: DataFetcher | None = None,
    market_data: MarketData | None = None,
    heloc_rates: RateProvider | None = None,
    margin_rates: RateProvider | None = None,
    tax_engine: TaxEngine | None = None,
) -> SimulationResult:
    """Run the backtest in the required order of operations."""

    config = config or SimulationConfig()
    data_fetcher = data_fetcher or DataFetcher(start=config.start, end=config.end)
    market_data = market_data or data_fetcher.fetch()
    heloc_rates = heloc_rates or FixedRateProvider(0.06)
    margin_rates = margin_rates or FixedRateProvider(0.07)
    tax_engine = tax_engine or TaxEngine()

    first_date = market_data.prices.index[0]
    portfolio = Portfolio.initialize(
        market_data.prices.loc[first_date], config=config.portfolio
    )

    snapshots: list[dict[str, float | str | pd.Timestamp]] = []

    for day, prices in market_data.prices.iterrows():
        dividends_per_share = market_data.dividends.loc[day]

        # 1. Receive dividends before servicing that day's interest.
        dividends = portfolio.receive_dividends(dividends_per_share)
        tax_engine.record_dividends(
            day.year,
            xdv=dividends.get("XDV.TO", 0.0),
            xaw=dividends.get("XAW.TO", 0.0),
        )

        # 2. Pay HELOC and margin interest; capitalize uncovered interest.
        interest = portfolio.service_interest(
            heloc_rate=heloc_rates.rate_for(day),
            margin_rate=margin_rates.rate_for(day),
        )
        tax_engine.record_interest(day.year, interest["interest_paid"])

        # 3. Check leverage and rebalance after interest has changed debt.
        rebalance = portfolio.average_down_if_needed(prices)
        tax_engine.record_capital_gain(day.year, float(rebalance["realized_gain"]))

        snapshot = portfolio.snapshot(day, prices)
        snapshot.update(
            {
                "xdv_dividend": dividends.get("XDV.TO", 0.0),
                "xaw_dividend": dividends.get("XAW.TO", 0.0),
                **interest,
                "rebalance_event": rebalance["event"],
                "heloc_draw_for_rebalance": rebalance["draw"],
                "realized_gain": rebalance["realized_gain"],
            }
        )
        snapshots.append(snapshot)

    annual_tax = [tax_engine.calculate_year(year) for year in sorted(tax_engine.ledgers)]
    return SimulationResult(
        daily=pd.DataFrame(snapshots).set_index("date"),
        annual_tax=pd.DataFrame(annual_tax).set_index("year"),
    )


if __name__ == "__main__":
    result = simulate()
    print(result.daily.tail())
    print(result.annual_tax.tail())
