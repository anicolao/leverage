import { describe, expect, test } from 'vitest';

import {
  equityOutcomeCompleteStartDates,
  equityOutcomeHistogram,
  equityOutcomeHorizonDays,
  equityOutcomeStartDates,
  simulateDcaPortfolio,
  summarizeSimulationRows
} from './dcaSimulator';
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
      maxHelocDebt: 1_000_000,
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
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'movingAverage'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].marginInterestOwing).toBeGreaterThan(0);
    expect(result[1].helocInterestOwing).toBeGreaterThan(0);
    expect(result[1].interestCapitalized).toBeCloseTo(result[1].marginInterestOwing, 8);
    expect(result[1].helocInterestPaidBySale).toBeCloseTo(result[1].helocInterestOwing, 8);
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
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'never'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].interestPaidBySale).toBeCloseTo(result[1].marginInterestOwing, 8);
    expect(result[1].interestCapitalized).toBe(0);
    expect(result[1].helocInterestPaidBySale).toBeCloseTo(result[1].helocInterestOwing, 8);
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
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'always'
    });

    expect(result[1].interestOwing).toBeGreaterThan(0);
    expect(result[1].interestCapitalized).toBeCloseTo(result[1].marginInterestOwing, 8);
    expect(result[1].helocInterestPaidBySale).toBeCloseTo(result[1].helocInterestOwing, 8);
    expect(result[1].interestPaidBySale).toBe(0);
  });

  test('uses distributions before selling shares to pay HELOC interest', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 125, dividends: 0 },
      { date: '2025-01-15', close: 125, dividends: 1.5 },
      { date: '2025-02-03', close: 125, dividends: 0 },
      { date: '2025-03-03', close: 125, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0.12 }],
      capitalizationPolicy: 'always'
    });

    expect(result[1].distributionsPaid).toBeCloseTo(1_500, 8);
    expect(result[1].taxDeduction).toBeCloseTo(
      result[1].interestOwing - result[1].distributionsPaid,
      8
    );
    expect(result[1].helocInterestOwing).toBeGreaterThan(0);
    expect(result[1].helocInterestPaidByDistributions).toBeCloseTo(
      result[1].helocInterestOwing,
      8
    );
    expect(result[1].helocInterestPaidBySale).toBe(0);
    expect(result[1].cashBalance).toBeGreaterThan(0);
    expect(result[1].equity).toBeCloseTo(
      result[1].totalAssets - result[1].totalDebt,
      8
    );

    expect(result[2].distributionsPaid).toBe(0);
    const carriedCashUsed = Math.min(result[2].helocInterestOwing, result[1].cashBalance);
    expect(result[2].helocInterestPaidByDistributions).toBeCloseTo(
      carriedCashUsed,
      8
    );
    expect(result[2].helocInterestPaidBySale).toBeCloseTo(
      result[2].helocInterestOwing - carriedCashUsed,
      8
    );
  });

  test('rounds rebalancing trades to the nearest 100-share board lot', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 97, dividends: 0 },
      { date: '2025-02-03', close: 97, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'always'
    });

    expect(result[0].shares).toBe(1_300);
    expect(result[0].shareDelta).toBe(1_300);
    expect(result[0].tradeAmount).toBe(126_100);
    expect(result[0].cashBalance).toBeCloseTo(-1_100, 8);
    expect(result[0].shareValue).toBe(126_100);
    expect(result[0].totalAssets).toBeCloseTo(125_000, 8);
    expect(result[0].marginDebt).toBeCloseTo(25_000, 8);
  });

  test('computes drawdowns to margin call and HELOC-cap collapse', () => {
    const rows: MarketRow[] = [{ date: '2025-01-02', close: 125, dividends: 0 }];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 120_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'always'
    });

    expect(result[0].shares).toBe(1_000);
    expect(result[0].shareValue).toBe(125_000);
    expect(result[0].marginDebt).toBe(25_000);
    expect(result[0].remainingHelocCapacity).toBe(20_000);
    expect(result[0].marginCallDrawdown).toBeCloseTo(0.7142857143, 8);
    expect(result[0].collapseDrawdown).toBeCloseTo(0.8742857143, 8);
  });

  test('sells shares to keep HELOC debt under the configured maximum', () => {
    const rows: MarketRow[] = [{ date: '2025-01-02', close: 100, dividends: 0 }];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 80_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'always'
    });

    expect(result[0].helocLimitPaidBySale).toBe(20_000);
    expect(result[0].helocDebt).toBe(80_000);
    expect(result[0].remainingHelocCapacity).toBe(0);
  });

  test('does not accumulate negative cash beyond half a board lot', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 97, dividends: 0 },
      { date: '2025-02-03', close: 97, dividends: 0 },
      { date: '2025-03-03', close: 97, dividends: 0 },
      { date: '2025-04-01', close: 97, dividends: 0 },
      { date: '2025-05-01', close: 97, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 100_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'always'
    });

    for (const row of result) {
      expect(row.cashBalance).toBeGreaterThanOrEqual(-50 * row.price);
    }
  });

  test('quarterly summary does not change monthly contribution cadence', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 10, dividends: 0 },
      { date: '2025-02-03', close: 10, dividends: 0 },
      { date: '2025-04-01', close: 10, dividends: 0 },
      { date: '2025-07-01', close: 10, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 300_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'movingAverage'
    });
    const summary = summarizeSimulationRows(result, 'quarterly');

    expect(result.map((row) => row.date)).toEqual([
      '2025-01-02',
      '2025-02-03',
      '2025-04-01',
      '2025-07-01'
    ]);
    expect(summary.map((row) => row.date)).toEqual(['2025-02-03', '2025-04-01', '2025-07-01']);
    expect(summary[0].contribution).toBe(200_000);
    expect(summary[0].taxDeduction).toBeCloseTo(
      result[0].taxDeduction + result[1].taxDeduction,
      8
    );
  });

  test('annual summary groups monthly contribution checkpoints by year', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 10, dividends: 0 },
      { date: '2025-04-01', close: 10, dividends: 0 },
      { date: '2026-01-02', close: 10, dividends: 0 }
    ];

    const result = simulateDcaPortfolio(rows, {
      startDate: '2025-01-01',
      investmentTarget: 200_000,
      monthlyContribution: 100_000,
      leverageTarget: 0.2,
      maxHelocDebt: 1_000_000,
      primeRates: [{ date: '2025-01-01', annualRate: 0 }],
      capitalizationPolicy: 'movingAverage'
    });
    const summary = summarizeSimulationRows(result, 'annually');

    expect(result.map((row) => row.date)).toEqual([
      '2025-01-02',
      '2025-04-01',
      '2026-01-02'
    ]);
    expect(summary.map((row) => row.date)).toEqual(['2025-04-01', '2026-01-02']);
    expect(summary[0].contribution).toBe(200_000);
  });

  test('builds final equity outcome histogram across rolling start dates', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 90, dividends: 0 },
      { date: '2025-03-03', close: 80, dividends: 0 }
    ];

    const buckets = equityOutcomeHistogram(
      rows,
      {
        startDate: '2025-01-01',
        investmentTarget: 100_000,
        monthlyContribution: 100_000,
        leverageTarget: 0.2,
        maxHelocDebt: 1_000_000,
        primeRates: [{ date: '2025-01-01', annualRate: 0 }],
        capitalizationPolicy: 'always'
      },
      3,
      100_000,
      0
    );

    expect(buckets).toEqual([
      {
        bucketStart: 0,
        bucketEnd: 100_000,
        count: 3,
        percent: 1,
        percentiles: [25, 50, 75]
      }
    ]);
  });

  test('reports cumulative equity outcome buckets with percentile markers', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 120, dividends: 0 },
      { date: '2025-02-03', close: 100, dividends: 0 },
      { date: '2025-03-03', close: 80, dividends: 0 },
      { date: '2025-04-01', close: 120, dividends: 0 }
    ];

    const buckets = equityOutcomeHistogram(
      rows,
      {
        startDate: '2025-01-01',
        investmentTarget: 100_000,
        monthlyContribution: 100_000,
        leverageTarget: 0.2,
        maxHelocDebt: 1_000_000,
        primeRates: [{ date: '2025-01-01', annualRate: 0 }],
        capitalizationPolicy: 'always'
      },
      3,
      25_000,
      29
    );

    expect(buckets.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      count: bucket.count,
      percent: bucket.percent,
      percentiles: bucket.percentiles
    }))).toEqual([
      { bucketStart: -25_000, count: 3, percent: 1, percentiles: [25] },
      { bucketStart: 0, count: 2, percent: 2 / 3, percentiles: [50] },
      { bucketStart: 50_000, count: 1, percent: 1 / 3, percentiles: [75] }
    ]);
  });

  test('centers rolling outcome starts on the selected start date', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 100, dividends: 0 },
      { date: '2025-03-03', close: 100, dividends: 0 },
      { date: '2025-04-01', close: 100, dividends: 0 },
      { date: '2025-05-01', close: 100, dividends: 0 }
    ];

    expect(equityOutcomeStartDates(rows, '2025-03-03', 3)).toEqual([
      '2025-02-03',
      '2025-03-03',
      '2025-04-01'
    ]);
  });

  test('clamps rolling outcome starts to the beginning of the simulation data', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 100, dividends: 0 },
      { date: '2025-03-03', close: 100, dividends: 0 },
      { date: '2025-04-01', close: 100, dividends: 0 },
      { date: '2025-05-01', close: 100, dividends: 0 }
    ];

    expect(equityOutcomeStartDates(rows, '2025-01-02', 3)).toEqual([
      '2025-01-02',
      '2025-02-03',
      '2025-03-03'
    ]);
  });

  test('filters outcome starts to dates with a complete fixed horizon', () => {
    const rows: MarketRow[] = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 100, dividends: 0 },
      { date: '2025-03-03', close: 100, dividends: 0 },
      { date: '2025-04-01', close: 100, dividends: 0 }
    ];

    expect(equityOutcomeCompleteStartDates(rows, '2025-02-03', 4, 4)).toEqual([
      '2025-01-02',
      '2025-02-03',
      '2025-03-03'
    ]);
  });

  test('uses an explicit fixed outcome horizon', () => {
    expect(equityOutcomeHorizonDays(5)).toBe(1_826);
    expect(equityOutcomeHorizonDays(10)).toBe(3_653);
    expect(equityOutcomeHorizonDays(15)).toBe(5_479);
    expect(equityOutcomeHorizonDays(20)).toBe(7_305);
  });
});
