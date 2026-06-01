import pandas as pd

from leverage_backtester.data import MarketData
from leverage_backtester.rates import FixedRateProvider
from leverage_backtester.simulator import SimulationConfig, simulate


def test_simulate_with_fixture_market_data_runs():
    index = pd.date_range("2025-01-01", periods=5, freq="D")
    prices = pd.DataFrame(
        {
            "XDV.TO": [25.0, 24.8, 24.5, 24.7, 25.1],
            "XAW.TO": [40.0, 39.0, 38.0, 39.5, 40.5],
        },
        index=index,
    )
    dividends = pd.DataFrame(0.0, index=index, columns=prices.columns)
    dividends.loc[index[2], "XDV.TO"] = 0.10
    dividends.loc[index[3], "XAW.TO"] = 0.04

    result = simulate(
        config=SimulationConfig(start="2025-01-01", end="2025-01-06"),
        market_data=MarketData(prices=prices, dividends=dividends),
        heloc_rates=FixedRateProvider(0.06),
        margin_rates=FixedRateProvider(0.07),
    )

    assert not result.daily.empty
    assert result.daily["portfolio_value"].iloc[0] == 2_500_000.0
    assert 2025 in result.annual_tax.index


def test_default_tax_config_handles_pre_2025_simulation_years():
    index = pd.date_range("2006-01-01", periods=2, freq="D")
    prices = pd.DataFrame(
        {"XDV.TO": [25.0, 25.1], "XAW.TO": [40.0, 40.1]},
        index=index,
    )
    dividends = pd.DataFrame(0.0, index=index, columns=prices.columns)

    result = simulate(
        config=SimulationConfig(start="2006-01-01", end="2006-01-03"),
        market_data=MarketData(prices=prices, dividends=dividends),
        heloc_rates=FixedRateProvider(0.06),
        margin_rates=FixedRateProvider(0.07),
    )

    assert 2006 in result.annual_tax.index
