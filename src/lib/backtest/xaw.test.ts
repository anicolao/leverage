import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import fixture from '../../../tests/fixtures/market-history.json';
import {
  annualDistributions,
  buildSyntheticXawPriceProxy,
  buildSyntheticXawProxy,
  scaleToActualAtStart,
  totalReturnIndex,
  type MarketRow
} from './marketData';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixturePath = fileURLToPath(new URL('../../../tests/fixtures/market-history.json', import.meta.url));

describe('synthetic XAW.TO', () => {
  test('TypeScript synthetic values match Python synthetic values', () => {
    const symbols = fixture.symbols as Record<string, MarketRow[]>;
    const typescriptRows = buildSyntheticXawProxy(
      {
        SPY: symbols.SPY,
        EFA: symbols.EFA,
        EEM: symbols.EEM
      },
      symbols['CAD=X'],
      undefined,
      undefined,
      0.31
    );
    const pythonRows = JSON.parse(
      execFileSync(
        'python',
        ['scripts/python_synthetic_xaw.py', fixturePath, '0.31'],
        { cwd: repoRoot, encoding: 'utf8' }
      )
    ) as MarketRow[];

    expect(typescriptRows).toHaveLength(pythonRows.length);
    for (let index = 0; index < typescriptRows.length; index += 1) {
      expect(typescriptRows[index].date).toBe(pythonRows[index].date);
      expect(typescriptRows[index].close).toBeCloseTo(pythonRows[index].close, 12);
      expect(typescriptRows[index].dividends).toBeCloseTo(pythonRows[index].dividends, 12);
    }
  });

  test('can scale synthetic pre-inception rows to the XAW inception anchor', () => {
    const synthetic = [
      { date: '2008-01-02', close: 50, dividends: 0.1 },
      { date: '2015-02-20', close: 100, dividends: 0.2 }
    ];
    const actual = [{ date: '2015-02-20', close: 20, dividends: 0 }];

    const scaled = scaleToActualAtStart(synthetic, actual, true);

    expect(scaled[0].date).toBe('2008-01-02');
    expect(scaled[0].close).toBeCloseTo(10, 12);
    expect(scaled[0].dividends).toBeCloseTo(0.02, 12);
    expect(scaled[1].date).toBe('2015-02-20');
    expect(scaled[1].close).toBeCloseTo(20, 12);
    expect(scaled[1].dividends).toBeCloseTo(0.04, 12);
  });

  test('fills missing component dates instead of dropping their portfolio weight', () => {
    const symbolData = {
      SPY: [
        { date: '2025-01-01', close: 100, dividends: 0 },
        { date: '2025-01-02', close: 110, dividends: 0 },
        { date: '2025-01-03', close: 110, dividends: 0 }
      ],
      EFA: [
        { date: '2025-01-01', close: 100, dividends: 0 },
        { date: '2025-01-03', close: 120, dividends: 0 }
      ]
    };
    const usdCad = [
      { date: '2025-01-01', close: 1, dividends: 0 },
      { date: '2025-01-02', close: 1, dividends: 0 },
      { date: '2025-01-03', close: 1, dividends: 0 }
    ];
    const weights = { SPY: 0.5, EFA: 0.5 };

    const totalReturn = buildSyntheticXawProxy(symbolData, usdCad, weights, 0);
    const price = buildSyntheticXawPriceProxy(symbolData, usdCad, weights, 0);

    expect(totalReturn.map((row) => [row.date, row.close])).toEqual([
      ['2025-01-01', 100],
      ['2025-01-02', 105],
      ['2025-01-03', 115]
    ]);
    expect(price.map((row) => [row.date, row.close])).toEqual([
      ['2025-01-01', 100],
      ['2025-01-02', 105],
      ['2025-01-03', 115]
    ]);
  });

  test('total return index includes price movement and distributions', () => {
    const rows = [
      { date: '2025-01-01', close: 100, dividends: 0 },
      { date: '2025-01-02', close: 110, dividends: 5 },
      { date: '2025-01-03', close: 99, dividends: 0 }
    ];

    const result = totalReturnIndex(rows);

    expect(result.map((row) => row.date)).toEqual([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03'
    ]);
    expect(result[0].close).toBeCloseTo(100, 12);
    expect(result[1].close).toBeCloseTo(115, 12);
    expect(result[2].close).toBeCloseTo(103.5, 12);
  });

  test('annual distributions aggregate daily cash distributions by calendar year', () => {
    const rows = [
      { date: '2025-01-01', close: 100, dividends: 0.1 },
      { date: '2025-03-01', close: 101, dividends: 0.2 },
      { date: '2026-01-01', close: 102, dividends: 0.3 }
    ];

    expect(annualDistributions(rows)).toEqual([
      { date: '2025', close: 0.30000000000000004, dividends: 0.30000000000000004 },
      { date: '2026', close: 0.3, dividends: 0.3 }
    ]);
  });
});
