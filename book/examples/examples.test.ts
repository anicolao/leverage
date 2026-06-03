import { describe, expect, test } from 'vitest';

import {
  fixtureMarginRate,
  interestFixture,
  simpleInterestForDays
} from './interest-fixture';
import {
  bookDefaultSimulationInput,
  defaultLeverageTarget,
  defaultScenarioPrimeRates,
  defaultScenarioStartDate
} from './default-scenario';

describe('book interest examples', () => {
  test('prime 4.45% maps to margin 3.50%', () => {
    expect(fixtureMarginRate()).toBeCloseTo(interestFixture.expectedMarginRate, 8);
  });

  test('interest fixture uses daily simple interest', () => {
    expect(
      simpleInterestForDays(
        interestFixture.debt,
        interestFixture.expectedMarginRate,
        interestFixture.elapsedDays
      )
    ).toBeCloseTo(76.6598220397, 8);
  });

  test('default scenario fixture matches production defaults', () => {
    const input = bookDefaultSimulationInput();

    expect(input.startDate).toBe(defaultScenarioStartDate);
    expect(input.investmentTarget).toBe(500_000);
    expect(input.monthlyContribution).toBe(100_000);
    expect(input.maxHelocDebt).toBe(1_000_000);
    expect(input.leverageTarget).toBeCloseTo(0.2, 8);
    expect(input.leverageTarget).toBe(defaultLeverageTarget());
    expect(input.capitalizationPolicy).toBe('always');
    expect(input.primeRates).toBe(defaultScenarioPrimeRates);
  });
});
