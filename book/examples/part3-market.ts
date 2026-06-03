import {
  simulateDcaPortfolio,
  type DcaSimulationInput,
  type DcaSimulationRow
} from '../../src/lib/backtest/dcaSimulator';
import { defaultDcaSimulationInput } from '../../src/lib/backtest/defaultScenario';
import type { MarketRow } from '../../src/lib/backtest/marketData';
import { realMarketFixture } from './market-fixture';

const demoRates = [{ date: '2025-01-01', annualRate: 0.06 }];

export function part3XawInput(overrides: Partial<DcaSimulationInput> = {}): DcaSimulationInput {
  const fixture = realMarketFixture();
  return {
    ...defaultDcaSimulationInput(fixture.start, demoRates),
    investmentTarget: 300_000,
    monthlyContribution: 25_000,
    maxHelocDebt: 450_000,
    leverageTarget: 0.2,
    ...overrides
  };
}

export function part3XawMarketRows(): MarketRow[] {
  return realMarketFixture().symbols['XAW.TO'];
}

export function part3XawSimulationRows(
  overrides: Partial<DcaSimulationInput> = {}
): DcaSimulationRow[] {
  return simulateDcaPortfolio(part3XawMarketRows(), part3XawInput(overrides));
}
