import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import fixture from '../../../tests/fixtures/market-history.json';
import { buildSyntheticXawProxy, type MarketRow } from './marketData';

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
});
