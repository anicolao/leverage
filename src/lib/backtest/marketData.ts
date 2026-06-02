export type MarketRow = {
  date: string;
  close: number;
  dividends: number;
};

export type WeightedSymbols = Record<string, MarketRow[]>;

const DEFAULT_WEIGHTS: Record<string, number> = {
  SPY: 0.55,
  EFA: 0.35,
  EEM: 0.1
};

const DEFAULT_XAW_MER = 0.0022;

export function totalReturnIndex(rows: MarketRow[], startValue = 100): MarketRow[] {
  const sorted = [...rows].sort(compareDate);
  let level = startValue;

  return sorted.map((row, index) => {
    if (index > 0) {
      const previous = sorted[index - 1];
      const dailyReturn = row.close / previous.close - 1 + row.dividends / previous.close;
      level *= 1 + dailyReturn;
    }

    return {
      date: row.date,
      close: level,
      dividends: row.dividends
    };
  });
}

export function buildSyntheticXawProxy(
  symbolData: WeightedSymbols,
  usdCadRows: MarketRow[],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
  annualExpenseRatio = DEFAULT_XAW_MER,
  distributionTaxDrag = 0
): MarketRow[] {
  const exchangeRates = [...usdCadRows].sort(compareDate);
  const totalReturnParts = new Map<string, number>();
  const dividendParts = new Map<string, number>();

  for (const [symbol, weight] of Object.entries(weights)) {
    const rows = [...(symbolData[symbol] ?? [])].sort(compareDate);
    const cadRows = rows.map((row) => {
      const exchangeRate = fillForwardClose(exchangeRates, row.date);
      return {
        date: row.date,
        close: row.close * exchangeRate,
        dividends: row.dividends * exchangeRate * (1 - distributionTaxDrag)
      };
    });

    for (const row of totalReturnIndex(cadRows)) {
      totalReturnParts.set(row.date, (totalReturnParts.get(row.date) ?? 0) + row.close * weight);
    }

    for (const row of cadRows) {
      dividendParts.set(row.date, (dividendParts.get(row.date) ?? 0) + row.dividends * weight);
    }
  }

  const rows = [...totalReturnParts.keys()].sort().map((date) => ({
    date,
    close: totalReturnParts.get(date) ?? 0,
    dividends: dividendParts.get(date) ?? 0
  }));

  return applyAnnualExpenseRatio(rows, annualExpenseRatio);
}

export function buildSyntheticXawPriceProxy(
  symbolData: WeightedSymbols,
  usdCadRows: MarketRow[],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
  annualExpenseRatio = DEFAULT_XAW_MER,
  distributionTaxDrag = 0
): MarketRow[] {
  const exchangeRates = [...usdCadRows].sort(compareDate);
  const priceParts = new Map<string, number>();
  const dividendParts = new Map<string, number>();
  const firstCadCloseBySymbol = new Map<string, number>();

  for (const [symbol, weight] of Object.entries(weights)) {
    const rows = [...(symbolData[symbol] ?? [])].sort(compareDate);
    for (const row of rows) {
      const exchangeRate = fillForwardClose(exchangeRates, row.date);
      const cadClose = row.close * exchangeRate;
      const firstCadClose = firstCadCloseBySymbol.get(symbol) ?? cadClose;
      firstCadCloseBySymbol.set(symbol, firstCadClose);
      const indexedClose = (cadClose / firstCadClose) * 100;
      const indexedDividend =
        ((row.dividends * exchangeRate * (1 - distributionTaxDrag)) / firstCadClose) * 100;
      priceParts.set(row.date, (priceParts.get(row.date) ?? 0) + indexedClose * weight);
      dividendParts.set(row.date, (dividendParts.get(row.date) ?? 0) + indexedDividend * weight);
    }
  }

  const rows = [...priceParts.keys()].sort().map((date) => ({
    date,
    close: priceParts.get(date) ?? 0,
    dividends: dividendParts.get(date) ?? 0
  }));

  return applyAnnualExpenseRatio(rows, annualExpenseRatio);
}

export function calibrateDistributionTaxDrag(
  symbolData: WeightedSymbols,
  usdCadRows: MarketRow[],
  actualRows: MarketRow[],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
  annualExpenseRatio = DEFAULT_XAW_MER
): number {
  const actual = totalReturnIndex(actualRows);
  const terminalError = (drag: number) => {
    const synthetic = buildSyntheticXawProxy(
      symbolData,
      usdCadRows,
      weights,
      annualExpenseRatio,
      drag
    );
    return terminalLogError(synthetic, actual);
  };

  const low = 0;
  const high = 0.6;
  const lowError = terminalError(low);
  const highError = terminalError(high);
  if (!Number.isFinite(lowError) || !Number.isFinite(highError)) {
    return 0;
  }
  if (Math.sign(lowError) === Math.sign(highError)) {
    return Math.abs(lowError) <= Math.abs(highError) ? low : high;
  }

  let left = low;
  let right = high;
  for (let index = 0; index < 40; index += 1) {
    const middle = (left + right) / 2;
    const middleError = terminalError(middle);
    if (Math.sign(middleError) === Math.sign(lowError)) {
      left = middle;
    } else {
      right = middle;
    }
  }

  return (left + right) / 2;
}

export function applyAnnualExpenseRatio(
  rows: MarketRow[],
  annualExpenseRatio: number
): MarketRow[] {
  if (annualExpenseRatio <= 0) {
    return rows.map((row) => ({ ...row }));
  }

  const sorted = [...rows].sort(compareDate);
  let multiplier = 1;
  let previousDate = sorted[0]?.date;

  return sorted.map((row, index) => {
    if (index > 0 && previousDate !== undefined) {
      const days = daysBetween(previousDate, row.date);
      multiplier *= (1 - annualExpenseRatio) ** (days / 365.25);
    }
    previousDate = row.date;

    return {
      date: row.date,
      close: row.close * multiplier,
      dividends: row.dividends
    };
  });
}

export function scaleToActualAtStart(synthetic: MarketRow[], actual: MarketRow[]): MarketRow[] {
  const sortedSynthetic = [...synthetic].sort(compareDate);
  const sortedActual = [...actual].sort(compareDate);
  const firstActual = sortedActual.find((row) => Number.isFinite(row.close));
  if (!firstActual) {
    throw new Error('Actual XAW.TO data is empty');
  }

  const syntheticAnchor =
    sortedSynthetic.find((row) => row.date === firstActual.date) ??
    sortedSynthetic.find((row) => row.date >= firstActual.date);
  if (!syntheticAnchor) {
    throw new Error('Synthetic XAW data has no anchor date at actual inception');
  }

  const scale = firstActual.close / syntheticAnchor.close;
  return sortedSynthetic
    .filter((row) => row.date >= firstActual.date)
    .map((row) => ({
      date: row.date,
      close: row.close * scale,
      dividends: row.dividends * scale
    }));
}

export function rebaseToFirstOverlap(
  leftRows: MarketRow[],
  rightRows: MarketRow[],
  startValue = 100
): { left: MarketRow[]; right: MarketRow[] } {
  const leftByDate = new Map(leftRows.map((row) => [row.date, row]));
  const overlapDate = [...rightRows.map((row) => row.date)]
    .sort()
    .find((date) => leftByDate.has(date));
  if (!overlapDate) {
    return { left: [], right: [] };
  }

  const leftAnchor = leftByDate.get(overlapDate)?.close;
  const rightAnchor = rightRows.find((row) => row.date === overlapDate)?.close;
  if (!leftAnchor || !rightAnchor) {
    return { left: [], right: [] };
  }

  return {
    left: leftRows
      .filter((row) => row.date >= overlapDate)
      .map((row) => ({
        ...row,
        close: (row.close / leftAnchor) * startValue,
        dividends: (row.dividends / leftAnchor) * startValue
      })),
    right: rightRows
      .filter((row) => row.date >= overlapDate)
      .map((row) => ({
        ...row,
        close: (row.close / rightAnchor) * startValue,
        dividends: (row.dividends / rightAnchor) * startValue
      }))
  };
}

export function annualDistributions(rows: MarketRow[]): MarketRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const year = row.date.slice(0, 4);
    totals.set(year, (totals.get(year) ?? 0) + row.dividends);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([year, value]) => ({
      date: year,
      close: value,
      dividends: value
    }));
}

export function calculateComparisonStats(
  synthetic: MarketRow[],
  actual: MarketRow[]
): {
  overlapDays: number;
  correlation: number;
  meanAbsolutePercentError: number;
  finalSynthetic: number;
  finalActual: number;
} {
  const syntheticByDate = new Map(synthetic.map((row) => [row.date, row.close]));
  const pairs = actual
    .map((row) => ({ actual: row.close, synthetic: syntheticByDate.get(row.date) }))
    .filter(
      (row): row is { actual: number; synthetic: number } =>
        row.synthetic !== undefined && row.actual > 0 && row.synthetic > 0
    );

  if (pairs.length === 0) {
    return {
      overlapDays: 0,
      correlation: Number.NaN,
      meanAbsolutePercentError: Number.NaN,
      finalSynthetic: Number.NaN,
      finalActual: Number.NaN
    };
  }

  return {
    overlapDays: pairs.length,
    correlation: correlation(
      pairs.map((row) => row.synthetic),
      pairs.map((row) => row.actual)
    ),
    meanAbsolutePercentError:
      pairs.reduce((total, row) => total + Math.abs(row.synthetic / row.actual - 1), 0) /
      pairs.length,
    finalSynthetic: pairs[pairs.length - 1].synthetic,
    finalActual: pairs[pairs.length - 1].actual
  };
}

function fillForwardClose(rows: MarketRow[], date: string): number {
  let candidate: MarketRow | undefined;
  for (const row of rows) {
    if (row.date > date) {
      break;
    }
    candidate = row;
  }
  if (!candidate) {
    throw new Error(`No exchange rate available on or before ${date}`);
  }
  return candidate.close;
}

function correlation(left: number[], right: number[]): number {
  const n = left.length;
  const meanLeft = left.reduce((total, value) => total + value, 0) / n;
  const meanRight = right.reduce((total, value) => total + value, 0) / n;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < n; index += 1) {
    const leftDelta = left[index] - meanLeft;
    const rightDelta = right[index] - meanRight;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }

  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? Number.NaN : numerator / denominator;
}

function compareDate(left: MarketRow, right: MarketRow): number {
  return left.date.localeCompare(right.date);
}

function terminalLogError(synthetic: MarketRow[], actual: MarketRow[]): number {
  const syntheticByDate = new Map(synthetic.map((row) => [row.date, row.close]));
  const pairs = actual
    .map((row) => ({ actual: row.close, synthetic: syntheticByDate.get(row.date) }))
    .filter(
      (row): row is { actual: number; synthetic: number } =>
        row.synthetic !== undefined && row.actual > 0 && row.synthetic > 0
    );
  if (pairs.length < 2) {
    return Number.NaN;
  }
  const start = pairs[0];
  const end = pairs[pairs.length - 1];
  return Math.log(end.synthetic / start.synthetic) - Math.log(end.actual / start.actual);
}

function daysBetween(start: string, end: string): number {
  const milliseconds =
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(0, milliseconds / 86_400_000);
}
