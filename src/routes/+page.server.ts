import {
  DEFAULT_ETF_STRATEGY,
  SINGLE_TICKER_STRATEGIES,
  annualDistributions,
  buildSyntheticXawProxy,
  buildSyntheticXawPriceProxy,
  calibrateDistributionTaxDrag,
  calculateComparisonStats,
  scaleToActualAtStart,
  totalReturnIndex,
  type EtfStrategy,
  type MarketRow,
  type ProxyWeightConfig,
  type WeightedSymbols
} from '$lib/backtest/marketData';
import { fetchCanadianPrimeRates } from '$lib/backtest/bankOfCanada';
import { fetchYahooHistory } from '$lib/backtest/yahoo';

export const prerender = true;

export async function load() {
  const simulationStart = '2006-01-01';
  const strategies = SINGLE_TICKER_STRATEGIES;
  const proxySymbols = unique(
    Object.values(strategies).flatMap((strategy) => Object.keys(strategy.syntheticWeights))
  );
  const targetSymbols = unique(Object.values(strategies).map((strategy) => strategy.ticker));
  const allYahooSymbols = unique([...proxySymbols, ...targetSymbols, 'CAD=X']);

  const [marketEntries, primeRates] = await Promise.all([
    Promise.all(
      allYahooSymbols.map(async (symbol) => [
        symbol,
        await fetchYahooHistory(symbol, historyStartForSymbol(symbol, strategies, simulationStart))
      ] as const)
    ),
    fetchCanadianPrimeRates(simulationStart)
  ]);

  const marketRows = Object.fromEntries(marketEntries) as Record<string, MarketRow[]>;
  const strategyResults = Object.fromEntries(
    (Object.entries(strategies) as Array<[EtfStrategy, ProxyWeightConfig]>).map(([key, config]) => [
      key,
      buildStrategyResult(config, marketRows, simulationStart)
    ])
  ) as Record<EtfStrategy, ReturnType<typeof buildStrategyResult>>;

  return {
    defaultStrategy: DEFAULT_ETF_STRATEGY,
    strategyOptions: (Object.entries(strategies) as Array<[EtfStrategy, ProxyWeightConfig]>).map(
      ([key, config]) => ({ key, ...config })
    ),
    strategyResults,
    primeRates
  };
}

function buildStrategyResult(
  config: ProxyWeightConfig,
  marketRows: Record<string, MarketRow[]>,
  simulationStart: string
) {
  const actualRows = rowsFrom(marketRows[config.ticker] ?? [], config.inceptionDate);
  const usdCadRows = marketRows['CAD=X'] ?? [];
  const symbolData = weightedSymbolRows(marketRows, config.syntheticWeights, simulationStart);
  const validationSymbolData = weightedSymbolRows(
    marketRows,
    config.syntheticWeights,
    config.inceptionDate
  );
  const validationUsdCad = rowsFrom(usdCadRows, config.inceptionDate);
  const distributionTaxDrag = calibrateDistributionTaxDrag(
    validationSymbolData,
    validationUsdCad,
    actualRows,
    config.syntheticWeights,
    config.expenseRatio
  );
  const synthetic = buildSyntheticXawProxy(
    validationSymbolData,
    validationUsdCad,
    config.syntheticWeights,
    config.expenseRatio,
    distributionTaxDrag
  );
  const actualTotalReturn = totalReturnIndex(actualRows);
  const validationSyntheticPrice = buildSyntheticXawPriceProxy(
    validationSymbolData,
    validationUsdCad,
    config.syntheticWeights,
    config.expenseRatio,
    distributionTaxDrag
  );
  const simulationSyntheticPriceBase = buildSyntheticXawPriceProxy(
    symbolData,
    usdCadRows,
    config.syntheticWeights,
    config.expenseRatio,
    distributionTaxDrag
  );
  const scaledSyntheticPrice = scaleToActualAtStart(validationSyntheticPrice, actualRows);
  const simulationSyntheticPrice = scaleToActualAtStart(
    simulationSyntheticPriceBase,
    actualRows,
    true
  );
  const end = actualRows.at(-1)?.date ?? config.inceptionDate;

  return {
    start: config.inceptionDate,
    config,
    series: {
      totalReturn: {
        synthetic,
        actual: actualTotalReturn
      },
      price: {
        synthetic: scaledSyntheticPrice,
        actual: actualRows
      },
      distributions: {
        synthetic: annualDistributions(scaledSyntheticPrice),
        actual: annualDistributions(actualRows)
      }
    },
    simulationSeries: simulationSyntheticPrice,
    stats: calculateComparisonStats(synthetic, actualTotalReturn),
    calibration: {
      distributionTaxDrag
    },
    yahooLinks: {
      chart: `https://finance.yahoo.com/quote/${encodeURIComponent(config.ticker)}/chart/`,
      prices: yahooHistoricalUrl(config.ticker, config.inceptionDate, end, 'history'),
      dividends: yahooHistoricalUrl(config.ticker, config.inceptionDate, end, 'div')
    }
  };
}

function weightedSymbolRows(
  marketRows: Record<string, MarketRow[]>,
  weights: Record<string, number>,
  start: string
): WeightedSymbols {
  return Object.fromEntries(
    Object.keys(weights).map((symbol) => [symbol, rowsFrom(marketRows[symbol] ?? [], start)])
  );
}

function historyStartForSymbol(
  symbol: string,
  strategies: Record<EtfStrategy, ProxyWeightConfig>,
  simulationStart: string
): string {
  const targetStrategy = Object.values(strategies).find((strategy) => strategy.ticker === symbol);
  return targetStrategy?.inceptionDate ?? simulationStart;
}

function yahooHistoricalUrl(
  ticker: string,
  start: string,
  end: string,
  filter: 'history' | 'div'
) {
  const url = new URL(`https://finance.yahoo.com/quote/${ticker}/history/`);
  url.searchParams.set('period1', String(toUnixSeconds(start)));
  url.searchParams.set('period2', String(toUnixSeconds(addDays(end, 1))));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('filter', filter);
  url.searchParams.set('frequency', '1d');
  url.searchParams.set('includeAdjustedClose', 'true');
  return url.toString();
}

function rowsFrom<T extends { date: string }>(rows: T[], start: string): T[] {
  return rows.filter((row) => row.date >= start);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toUnixSeconds(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
