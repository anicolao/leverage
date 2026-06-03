import fixture from '../../tests/fixtures/market-overlap-2023.json';
import {
  annualDistributions,
  buildSyntheticXawPriceProxy,
  buildSyntheticXawProxy,
  calculateComparisonStats,
  calibrateDistributionTaxDrag,
  scaleToActualAtStart,
  totalReturnIndex,
  type MarketRow
} from '../../src/lib/backtest/marketData';

export type MarketComparisonRow = {
  date: string;
  actualPrice: number;
  syntheticPrice: number;
  actualTotalReturn: number;
  syntheticTotalReturn: number;
  actualDistribution: number;
  syntheticDistribution: number;
};

const symbols = fixture.symbols as Record<string, MarketRow[]>;

export function realMarketFixture() {
  return {
    start: fixture.start,
    end: fixture.end,
    source: fixture.source,
    symbols
  };
}

export function realMarketComparison() {
  const actualXaw = symbols['XAW.TO'];
  const componentRows = {
    SPY: symbols.SPY,
    EFA: symbols.EFA,
    EEM: symbols.EEM
  };
  const usdCad = symbols['CAD=X'];
  const distributionTaxDrag = calibrateDistributionTaxDrag(componentRows, usdCad, actualXaw);
  const syntheticTotalReturn = buildSyntheticXawProxy(
    componentRows,
    usdCad,
    undefined,
    undefined,
    distributionTaxDrag
  );
  const actualTotalReturn = totalReturnIndex(actualXaw);
  const syntheticPrice = scaleToActualAtStart(
    buildSyntheticXawPriceProxy(componentRows, usdCad, undefined, undefined, distributionTaxDrag),
    actualXaw
  );
  const stats = calculateComparisonStats(syntheticTotalReturn, actualTotalReturn);
  const rows = comparisonRows(
    actualXaw,
    syntheticPrice,
    actualTotalReturn,
    syntheticTotalReturn
  );

  return {
    actualXaw,
    actualTotalReturn,
    distributionTaxDrag,
    rows,
    stats,
    syntheticPrice,
    syntheticTotalReturn,
    distributions: {
      actual: annualDistributions(actualXaw),
      synthetic: annualDistributions(syntheticPrice)
    }
  };
}

function comparisonRows(
  actualPrice: MarketRow[],
  syntheticPrice: MarketRow[],
  actualTotalReturn: MarketRow[],
  syntheticTotalReturn: MarketRow[]
): MarketComparisonRow[] {
  const syntheticPriceByDate = new Map(syntheticPrice.map((row) => [row.date, row]));
  const actualReturnByDate = new Map(actualTotalReturn.map((row) => [row.date, row]));
  const syntheticReturnByDate = new Map(syntheticTotalReturn.map((row) => [row.date, row]));

  return actualPrice.flatMap((actualRow) => {
    const syntheticPriceRow = syntheticPriceByDate.get(actualRow.date);
    const actualReturnRow = actualReturnByDate.get(actualRow.date);
    const syntheticReturnRow = syntheticReturnByDate.get(actualRow.date);
    if (!syntheticPriceRow || !actualReturnRow || !syntheticReturnRow) {
      return [];
    }

    return [
      {
        date: actualRow.date,
        actualPrice: actualRow.close,
        syntheticPrice: syntheticPriceRow.close,
        actualTotalReturn: actualReturnRow.close,
        syntheticTotalReturn: syntheticReturnRow.close,
        actualDistribution: actualRow.dividends,
        syntheticDistribution: syntheticPriceRow.dividends
      }
    ];
  });
}
