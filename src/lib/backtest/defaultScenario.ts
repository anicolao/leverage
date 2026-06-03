import type {
  CapitalizationPolicy,
  DcaSimulationInput,
  SimulationInterval
} from './dcaSimulator';
import type { PrimeRateRow } from './bankOfCanada';

export type DefaultDcaScenarioParameters = {
  investmentTarget: number;
  maxHelocDebt: number;
  monthlyContribution: number;
  leverageTargetPercent: number;
  capitalizationPolicy: CapitalizationPolicy;
  simulationInterval: SimulationInterval;
  outcomeHorizonYears: number;
};

//#region default-dca-scenario-parameters
export const DEFAULT_DCA_SCENARIO_PARAMETERS: DefaultDcaScenarioParameters = {
  investmentTarget: 500_000,
  maxHelocDebt: 1_000_000,
  monthlyContribution: 100_000,
  leverageTargetPercent: 20,
  capitalizationPolicy: 'always',
  simulationInterval: 'monthly',
  outcomeHorizonYears: 10
};
//#endregion default-dca-scenario-parameters

export function leverageTargetFromPercent(percent: number): number {
  return Math.min(0.95, Math.max(0, percent / 100));
}

export function defaultDcaSimulationInput(
  startDate: string,
  primeRates: PrimeRateRow[]
): DcaSimulationInput {
  return {
    startDate,
    investmentTarget: DEFAULT_DCA_SCENARIO_PARAMETERS.investmentTarget,
    monthlyContribution: DEFAULT_DCA_SCENARIO_PARAMETERS.monthlyContribution,
    leverageTarget: leverageTargetFromPercent(
      DEFAULT_DCA_SCENARIO_PARAMETERS.leverageTargetPercent
    ),
    maxHelocDebt: DEFAULT_DCA_SCENARIO_PARAMETERS.maxHelocDebt,
    primeRates,
    capitalizationPolicy: DEFAULT_DCA_SCENARIO_PARAMETERS.capitalizationPolicy
  };
}
