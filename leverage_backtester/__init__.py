"""Leveraged Canadian portfolio backtester scaffold."""

from leverage_backtester.data import DataFetcher, MarketData
from leverage_backtester.portfolio import Portfolio, PortfolioConfig
from leverage_backtester.rates import CsvRateProvider, FixedRateProvider
from leverage_backtester.simulator import SimulationConfig, simulate
from leverage_backtester.tax import TaxEngine, default_ontario_2025_config

__all__ = [
    "CsvRateProvider",
    "DataFetcher",
    "FixedRateProvider",
    "MarketData",
    "Portfolio",
    "PortfolioConfig",
    "SimulationConfig",
    "TaxEngine",
    "default_ontario_2025_config",
    "simulate",
]
