from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class TaxBracket:
    upper: float | None
    rate: float


@dataclass(frozen=True)
class ProgressiveTaxSchedule:
    brackets: tuple[TaxBracket, ...]

    def tax_on(self, income: float) -> float:
        taxable = max(0.0, income)
        tax = 0.0
        lower = 0.0
        for bracket in self.brackets:
            upper = taxable if bracket.upper is None else min(taxable, bracket.upper)
            if upper > lower:
                tax += (upper - lower) * bracket.rate
            if bracket.upper is not None and taxable > bracket.upper:
                lower = bracket.upper
                continue
            break
        return tax


@dataclass(frozen=True)
class TaxYearConfig:
    year: int
    federal: ProgressiveTaxSchedule
    ontario: ProgressiveTaxSchedule
    eligible_dividend_gross_up: float = 0.38
    capital_gains_inclusion_rate: float = 0.50
    federal_eligible_dividend_credit_rate: float = 0.150198
    ontario_eligible_dividend_credit_rate: float = 0.10


@dataclass
class TaxLedger:
    eligible_dividends: float = 0.0
    foreign_income: float = 0.0
    deductible_interest: float = 0.0
    realized_capital_gains: float = 0.0


@dataclass
class TaxEngine:
    configs: dict[int, TaxYearConfig] = field(
        default_factory=lambda: {2025: default_ontario_2025_config()}
    )
    ledgers: dict[int, TaxLedger] = field(default_factory=dict)

    def record_dividends(self, year: int, xdv: float, xaw: float) -> None:
        ledger = self._ledger(year)
        ledger.eligible_dividends += xdv
        ledger.foreign_income += xaw

    def record_interest(self, year: int, amount: float) -> None:
        self._ledger(year).deductible_interest += amount

    def record_capital_gain(self, year: int, amount: float) -> None:
        self._ledger(year).realized_capital_gains += amount

    def calculate_year(self, year: int) -> dict[str, float | int]:
        config = self._config_for(year)
        ledger = self._ledger(year)

        grossed_up_dividends = ledger.eligible_dividends * (
            1.0 + config.eligible_dividend_gross_up
        )
        taxable_capital_gains = (
            max(0.0, ledger.realized_capital_gains)
            * config.capital_gains_inclusion_rate
        )
        taxable_income = (
            grossed_up_dividends
            + ledger.foreign_income
            + taxable_capital_gains
            - ledger.deductible_interest
        )
        before_credits = config.federal.tax_on(taxable_income) + config.ontario.tax_on(
            taxable_income
        )
        dividend_credit = grossed_up_dividends * (
            config.federal_eligible_dividend_credit_rate
            + config.ontario_eligible_dividend_credit_rate
        )
        tax_payable = max(0.0, before_credits - dividend_credit)

        return {
            "year": year,
            "eligible_dividends": ledger.eligible_dividends,
            "foreign_income": ledger.foreign_income,
            "deductible_interest": ledger.deductible_interest,
            "realized_capital_gains": ledger.realized_capital_gains,
            "taxable_income": taxable_income,
            "grossed_up_dividends": grossed_up_dividends,
            "tax_before_dividend_credits": before_credits,
            "dividend_tax_credit": dividend_credit,
            "tax_payable": tax_payable,
        }

    def _ledger(self, year: int) -> TaxLedger:
        if year not in self.ledgers:
            self.ledgers[year] = TaxLedger()
        return self.ledgers[year]

    def _config_for(self, year: int) -> TaxYearConfig:
        if year in self.configs:
            return self.configs[year]
        prior_years = [candidate for candidate in self.configs if candidate <= year]
        if prior_years:
            return self.configs[max(prior_years)]
        return self.configs[min(self.configs)]


def default_ontario_2025_config() -> TaxYearConfig:
    federal = ProgressiveTaxSchedule(
        brackets=(
            TaxBracket(57_375.0, 0.15),
            TaxBracket(114_750.0, 0.205),
            TaxBracket(177_882.0, 0.26),
            TaxBracket(253_414.0, 0.29),
            TaxBracket(None, 0.33),
        )
    )
    ontario = ProgressiveTaxSchedule(
        brackets=(
            TaxBracket(52_886.0, 0.0505),
            TaxBracket(105_775.0, 0.0915),
            TaxBracket(150_000.0, 0.1116),
            TaxBracket(220_000.0, 0.1216),
            TaxBracket(None, 0.1316),
        )
    )
    return TaxYearConfig(year=2025, federal=federal, ontario=ontario)
