import {
  annualDistributions,
  buildSyntheticXawProxy,
  buildSyntheticXawPriceProxy,
  calibrateDistributionTaxDrag,
  calculateComparisonStats,
  scaleToActualAtStart,
  totalReturnIndex
} from '$lib/backtest/marketData';
import { fetchCanadianPrimeRates } from '$lib/backtest/bankOfCanada';
import { fetchYahooHistory } from '$lib/backtest/yahoo';

export async function load() {
  const simulationStart = '2006-01-01';
  const xawStart = '2015-02-10';
  const [spy, efa, eem, usdCad, actualXaw, primeRates] = await Promise.all([
    fetchYahooHistory('SPY', simulationStart),
    fetchYahooHistory('EFA', simulationStart),
    fetchYahooHistory('EEM', simulationStart),
    fetchYahooHistory('CAD=X', simulationStart),
    fetchYahooHistory('XAW.TO', xawStart),
    fetchCanadianPrimeRates(simulationStart)
  ]);

  const symbolData = { SPY: spy, EFA: efa, EEM: eem };
  const distributionTaxDrag = calibrateDistributionTaxDrag(symbolData, usdCad, actualXaw);
  const synthetic = buildSyntheticXawProxy(
    symbolData,
    usdCad,
    undefined,
    undefined,
    distributionTaxDrag
  );
  const actualTotalReturn = totalReturnIndex(actualXaw);
  const syntheticPrice = buildSyntheticXawPriceProxy(
    symbolData,
    usdCad,
    undefined,
    undefined,
    distributionTaxDrag
  );
  const scaledSyntheticPrice = scaleToActualAtStart(syntheticPrice, actualXaw);
  const simulationSyntheticPrice = scaleToActualAtStart(syntheticPrice, actualXaw, true);
  const distributionSeries = {
    synthetic: annualDistributions(scaledSyntheticPrice),
    actual: annualDistributions(actualXaw)
  };
  const stats = calculateComparisonStats(synthetic, actualTotalReturn);
  const end = actualXaw.at(-1)?.date ?? xawStart;

  return {
    start: xawStart,
    series: {
      totalReturn: {
        synthetic,
        actual: actualTotalReturn
      },
      price: {
        synthetic: scaledSyntheticPrice,
        actual: actualXaw
      },
      distributions: distributionSeries
    },
    simulationSeries: simulationSyntheticPrice,
    primeRates,
    stats,
    calibration: {
      distributionTaxDrag
    },
    yahooLinks: {
      chart: 'https://finance.yahoo.com/quote/XAW.TO/chart/',
      prices: yahooHistoricalUrl(xawStart, end, 'history'),
      dividends: yahooHistoricalUrl(xawStart, end, 'div')
    }
  };
}

function yahooHistoricalUrl(start: string, end: string, filter: 'history' | 'div') {
  const url = new URL('https://finance.yahoo.com/quote/XAW.TO/history/');
  url.searchParams.set('period1', String(toUnixSeconds(start)));
  url.searchParams.set('period2', String(toUnixSeconds(addDays(end, 1))));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('filter', filter);
  url.searchParams.set('frequency', '1d');
  url.searchParams.set('includeAdjustedClose', 'true');
  return url.toString();
}

function toUnixSeconds(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
