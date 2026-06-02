import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import fixture from '../../../tests/fixtures/market-history.json';
import { buildSyntheticXawProxy, scaleToActualAtStart, type MarketRow } from './marketData';

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
});
