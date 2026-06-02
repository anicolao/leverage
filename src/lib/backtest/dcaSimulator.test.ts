import { describe, expect, test } from 'vitest';

import { simulateDcaPortfolio } from './dcaSimulator';
import type { MarketRow } from './marketData';

describe('simulateDcaPortfolio', () => {
  test('targets margin debt as a percentage of brokerage assets', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 10, dividends: 0 },
      { date: '2025-02-03', close: 10, dividends: 0 },
      { date: '2025-03-03', close: 10, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 500_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'movingAverage'
    });

    expect(result[0].contribution).toBe(100_000);
    expect(result[0].helocDebt).toBeCloseTo(100_000, 8);
    expect(result[0].shareValue).toBeCloseTo(125_000, 8);
    expect(result[0].marginDebt).toBeCloseTo(25_000, 8);
    expect(result[0].equity).toBe(0);
    expect(result[0].totalDebt).toBeCloseTo(125_000, 8);
    expect(result[0].leverage).toBeCloseTo(0.2, 8);
  });

  test('capitalizes monthly interest when price is below moving average', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 90, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'movingAverage'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].interestCapitalized).toBeCloseTo(result[1].interestOwing, 8);
    expect(result[1].interestPaidBySale).toBe(0);
  });

  test('never policy sells shares to pay monthly interest', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 90, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'never'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].interestPaidBySale).toBeCloseTo(result[1].interestOwing, 8);
    expect(result[1].interestCapitalized).toBe(0);
  });

  test('always policy capitalizes monthly interest', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 110, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'always'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].interestCapitalized).toBeCloseTo(result[1].interestOwing, 8);
    expect(result[1].interestPaidBySale).toBe(0);
  });
});
