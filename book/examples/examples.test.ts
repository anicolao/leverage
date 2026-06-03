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
import { interfaceSectionIds, interfaceSections } from './interface-inventory';
import { realMarketComparison, realMarketFixture } from './market-fixture';

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

  test('interface inventory names a question and validation artifact for every section', () => {
    expect(interfaceSectionIds()).toEqual([
      'validation-summary',
      'comparison-charts',
      'simulation-controls',
      'portfolio-stats',
      'portfolio-path',
      'checkpoint-table',
      'outcome-histogram'
    ]);

    for (const section of interfaceSections) {
      expect(section.title).not.toBe('');
      expect(section.appLabel).not.toBe('');
      expect(section.question).toMatch(/\?$/);
      expect(section.validationArtifact).not.toBe('');
    }
  });

  test('real market fixture contains enough XAW overlap data for book examples', () => {
    const fixture = realMarketFixture();

    expect(fixture.start).toBe('2023-01-03');
    expect(fixture.end).toBe('2023-12-29');
    expect(fixture.symbols['XAW.TO']).toHaveLength(250);
    expect(fixture.symbols.SPY).toHaveLength(250);
    expect(fixture.symbols['XAW.TO'].filter((row) => row.dividends > 0)).toHaveLength(2);
  });

  test('real market comparison mirrors production proxy calculations', () => {
    const comparison = realMarketComparison();

    expect(comparison.rows.length).toBeGreaterThan(200);
    expect(comparison.stats.overlapDays).toBeGreaterThan(200);
    expect(comparison.stats.correlation).toBeGreaterThan(0.95);
    expect(comparison.stats.meanAbsolutePercentError).toBeLessThan(0.04);
    expect(comparison.rows[0].actualPrice).toBeCloseTo(31.574167, 6);
    expect(comparison.rows.at(-1)?.actualPrice).toBeCloseTo(36.367306, 6);
  });
});
