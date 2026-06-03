import {
  DEFAULT_DCA_SCENARIO_PARAMETERS,
  defaultDcaSimulationInput,
  leverageTargetFromPercent
} from '../../src/lib/backtest/defaultScenario';
import type { PrimeRateRow } from '../../src/lib/backtest/bankOfCanada';

export const defaultScenarioStartDate = '2006-01-03';
export const defaultScenarioPrimeRates: PrimeRateRow[] = [
  { date: '2006-01-01', annualRate: 0.0445 }
];

export function bookDefaultSimulationInput() {
  return defaultDcaSimulationInput(defaultScenarioStartDate, defaultScenarioPrimeRates);
}

export function defaultScenarioSummaryRows() {
  const input = bookDefaultSimulationInput();
  return [
    ['Start date', input.startDate],
    ['Investment target', DEFAULT_DCA_SCENARIO_PARAMETERS.investmentTarget],
    ['Monthly investment', DEFAULT_DCA_SCENARIO_PARAMETERS.monthlyContribution],
    ['Max HELOC debt', DEFAULT_DCA_SCENARIO_PARAMETERS.maxHelocDebt],
    ['Margin leverage target', input.leverageTarget],
    ['Margin-interest capitalization', input.capitalizationPolicy]
  ] as const;
}

export function defaultLeverageTarget() {
  return leverageTargetFromPercent(DEFAULT_DCA_SCENARIO_PARAMETERS.leverageTargetPercent);
}
