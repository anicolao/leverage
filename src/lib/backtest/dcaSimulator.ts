import type { MarketRow } from './marketData';
import type { PrimeRateRow } from './bankOfCanada';

export type DcaSimulationInput = {
  startDate: string;
  investmentTarget: number;
  monthlyContribution: number;
  leverageTarget: number;
  maxHelocDebt: number;
  primeRates: PrimeRateRow[];
  capitalizationPolicy: CapitalizationPolicy;
};

export type CapitalizationPolicy = 'never' | 'movingAverage' | 'negativeEquity' | 'always';
export type SimulationInterval = 'monthly' | 'quarterly' | 'annually';
export type EquityOutcomeBucket = {
  bucketStart: number;
  bucketEnd: number;
  count: number;
  percent: number;
  percentiles: number[];
};

export type DcaSimulationRow = {
  date: string;
  price: number;
  movingAverage120: number;
  contribution: number;
  cumulativeContribution: number;
  tradeAmount: number;
  shareDelta: number;
  distributionsPaid: number;
  primeRate: number;
  interestOwing: number;
  marginInterestOwing: number;
  helocInterestOwing: number;
  taxDeduction: number;
  interestPaidBySale: number;
  helocInterestPaidByDistributions: number;
  helocInterestPaidBySale: number;
  helocLimitPaidBySale: number;
  interestCapitalized: number;
  shares: number;
  shareValue: number;
  cashBalance: number;
  totalAssets: number;
  marginDebt: number;
  helocDebt: number;
  totalDebt: number;
  equity: number;
  leverage: number;
  remainingHelocCapacity: number;
  marginCallDrawdown: number;
  collapseDrawdown: number;
};

const DAYS_PER_YEAR = 365.25;
const BOARD_LOT_SIZE = 100;
const MAINTENANCE_MARGIN_REQUIREMENT = 0.3;
const DEFAULT_OUTCOME_BUCKET_WIDTH = 100_000;
const TEN_YEARS_IN_DAYS = 3_653;

export function simulateDcaPortfolio(
  marketRows: MarketRow[],
  input: DcaSimulationInput
): DcaSimulationRow[] {
  const sortedRows = [...marketRows].sort((left, right) => left.date.localeCompare(right.date));
  const movingAverages = movingAverageByDate(sortedRows, 120);
  const rows = sortedRows.filter((row) => row.date >= input.startDate);
  const monthlyDates = firstTradingDateByInterval(rows, 'monthly');
  const primeRates = [...input.primeRates].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const results: DcaSimulationRow[] = [];

  let shares = 0;
  let marginDebt = 0;
  let helocDebt = 0;
  let cumulativeContribution = 0;
  let pendingInterest = 0;
  let pendingMarginInterest = 0;
  let pendingHelocInterest = 0;
  let pendingDistributions = 0;
  let distributionCashBalance = 0;
  let roundingCashBalance = 0;
  let previousDate = rows[0]?.date;

  for (const row of rows) {
    if (previousDate !== undefined) {
      const elapsedDays = daysBetween(previousDate, row.date);
      const primeRate = fillForwardPrimeRate(primeRates, previousDate);
      pendingMarginInterest += marginDebt * primeRate * (elapsedDays / DAYS_PER_YEAR);
      pendingHelocInterest += helocDebt * primeRate * (elapsedDays / DAYS_PER_YEAR);
      pendingInterest = pendingMarginInterest + pendingHelocInterest;
    }
    const distribution = shares * row.dividends;
    pendingDistributions += distribution;
    distributionCashBalance += distribution;

    if (monthlyDates.has(row.date)) {
      const movingAverage120 = movingAverages.get(row.date) ?? row.close;
      const primeRate = fillForwardPrimeRate(primeRates, row.date);
      const marginInterestOwing = pendingMarginInterest;
      const helocInterestOwing = pendingHelocInterest;
      const interestOwing = marginInterestOwing + helocInterestOwing;
      const distributionsPaid = pendingDistributions;
      const taxDeduction = interestOwing - distributionsPaid;
      let interestPaidBySale = 0;
      let helocInterestPaidByDistributions = 0;
      let helocInterestPaidBySale = 0;
      let helocLimitPaidBySale = 0;
      let interestCapitalized = 0;

      if (marginInterestOwing > 0) {
        const shareValueBeforeInterest = shares * row.close;
        const equityBeforeInterest = shareValueBeforeInterest - marginDebt - helocDebt;
        const shouldCapitalize = shouldCapitalizeInterest(
          input.capitalizationPolicy,
          row.close,
          movingAverage120,
          equityBeforeInterest
        );

        if (!shouldCapitalize && shares > 0) {
          interestPaidBySale = Math.min(marginInterestOwing, shares * row.close);
          shares -= interestPaidBySale / row.close;
          interestCapitalized = marginInterestOwing - interestPaidBySale;
          helocDebt += interestCapitalized;
        } else {
          interestCapitalized = marginInterestOwing;
          helocDebt += interestCapitalized;
        }
      }
      if (helocInterestOwing > 0) {
        helocInterestPaidByDistributions = Math.min(
          helocInterestOwing,
          distributionCashBalance
        );
        distributionCashBalance -= helocInterestPaidByDistributions;
        const remainingHelocInterest =
          helocInterestOwing - helocInterestPaidByDistributions;
        helocInterestPaidBySale = Math.min(remainingHelocInterest, shares * row.close);
        shares -= helocInterestPaidBySale / row.close;
      }

      const contribution = Math.min(
        input.monthlyContribution,
        Math.max(0, input.investmentTarget - cumulativeContribution)
      );
      cumulativeContribution += contribution;
      helocDebt += contribution;

      const shareValueBeforeTrade = shares * row.close;
      const brokerageEquityAfterContribution =
        shareValueBeforeTrade - marginDebt + contribution;
      const desiredShareValue = Math.max(
        0,
        input.leverageTarget >= 1
          ? shareValueBeforeTrade
          : brokerageEquityAfterContribution / (1 - input.leverageTarget)
      );
      const desiredMarginDebt = Math.max(0, desiredShareValue * input.leverageTarget);
      const desiredShares = desiredShareValue / row.close;
      const roundedShares = roundSharesToNearestBoardLot(desiredShares);
      const shareDelta = roundedShares - shares;
      const tradeAmount = shareDelta * row.close;
      shares = roundedShares;
      roundingCashBalance = desiredShareValue - shares * row.close;

      marginDebt = desiredMarginDebt;

      if (helocDebt > input.maxHelocDebt) {
        const overage = helocDebt - input.maxHelocDebt;
        helocLimitPaidBySale = Math.min(overage, shares * row.close);
        shares -= helocLimitPaidBySale / row.close;
        helocDebt -= helocLimitPaidBySale;
      }

      const shareValue = shares * row.close;
      const cashBalance = distributionCashBalance + roundingCashBalance;
      const totalAssets = shareValue + cashBalance;
      const totalDebt = marginDebt + helocDebt;
      const equity = totalAssets - totalDebt;
      const remainingHelocCapacity = Math.max(0, input.maxHelocDebt - helocDebt);
      const marginCallDrawdown = drawdownToMaintenanceMarginCall(
        shareValue,
        cashBalance,
        marginDebt,
        MAINTENANCE_MARGIN_REQUIREMENT
      );
      const collapseDrawdown = drawdownToMaintenanceMarginCall(
        shareValue,
        cashBalance + remainingHelocCapacity,
        marginDebt,
        MAINTENANCE_MARGIN_REQUIREMENT
      );
      results.push({
        date: row.date,
        price: row.close,
        movingAverage120,
        contribution,
        cumulativeContribution,
        tradeAmount,
        shareDelta,
        distributionsPaid,
        primeRate,
        interestOwing,
        marginInterestOwing,
        helocInterestOwing,
        taxDeduction,
        interestPaidBySale,
        helocInterestPaidByDistributions,
        helocInterestPaidBySale,
        helocLimitPaidBySale,
        interestCapitalized,
        shares,
        shareValue,
        cashBalance,
        totalAssets,
        marginDebt,
        helocDebt,
        totalDebt,
        equity,
        leverage: shareValue === 0 ? 0 : marginDebt / shareValue,
        remainingHelocCapacity,
        marginCallDrawdown,
        collapseDrawdown
      });

      pendingInterest = 0;
      pendingMarginInterest = 0;
      pendingHelocInterest = 0;
      pendingDistributions = 0;
    }

    previousDate = row.date;
  }

  return results;
}

export function summarizeSimulationRows(
  rows: DcaSimulationRow[],
  interval: SimulationInterval
): DcaSimulationRow[] {
  if (interval === 'monthly') {
    return rows.map((row) => ({ ...row }));
  }

  const grouped = new Map<string, DcaSimulationRow[]>();
  for (const row of rows) {
    const key = periodKey(row.date, interval);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.values()].map((group) => {
    const last = group[group.length - 1];
    return {
      ...last,
      contribution: sum(group, 'contribution'),
      tradeAmount: sum(group, 'tradeAmount'),
      shareDelta: sum(group, 'shareDelta'),
      distributionsPaid: sum(group, 'distributionsPaid'),
      interestOwing: sum(group, 'interestOwing'),
      marginInterestOwing: sum(group, 'marginInterestOwing'),
      helocInterestOwing: sum(group, 'helocInterestOwing'),
      taxDeduction: sum(group, 'taxDeduction'),
      interestPaidBySale: sum(group, 'interestPaidBySale'),
      helocInterestPaidByDistributions: sum(group, 'helocInterestPaidByDistributions'),
      helocInterestPaidBySale: sum(group, 'helocInterestPaidBySale'),
      helocLimitPaidBySale: sum(group, 'helocLimitPaidBySale'),
      interestCapitalized: sum(group, 'interestCapitalized')
    };
  });
}

export function equityOutcomeHistogram(
  marketRows: MarketRow[],
  input: DcaSimulationInput,
  windowSize = 1_000,
  bucketWidth = DEFAULT_OUTCOME_BUCKET_WIDTH,
  horizonDays = TEN_YEARS_IN_DAYS
): EquityOutcomeBucket[] {
  const sortedRows = [...marketRows].sort((left, right) => left.date.localeCompare(right.date));
  const startDates = equityOutcomeCompleteStartDates(
    sortedRows,
    input.startDate,
    horizonDays,
    windowSize
  );

  const outcomes: number[] = [];
  for (const startDate of startDates) {
    const finalEquity = equityOutcomeForStartDate(sortedRows, input, startDate, horizonDays);
    if (finalEquity === undefined || !Number.isFinite(finalEquity)) {
      continue;
    }
    outcomes.push(finalEquity);
  }

  return equityOutcomeBucketsFromOutcomes(outcomes, bucketWidth);
}

export function equityOutcomeForStartDate(
  sortedMarketRows: MarketRow[],
  input: DcaSimulationInput,
  startDate: string,
  horizonDays: number
): number | undefined {
  const endDate = addDays(startDate, horizonDays);
  const rows = simulateDcaPortfolio(
    sortedMarketRows.filter((row) => row.date <= endDate),
    { ...input, startDate }
  );
  return rows.at(-1)?.equity;
}

export function equityOutcomeBucketsFromOutcomes(
  outcomes: number[],
  bucketWidth = DEFAULT_OUTCOME_BUCKET_WIDTH
): EquityOutcomeBucket[] {
  const counts = new Map<number, number>();
  for (const outcome of outcomes) {
    const bucketStart = Math.floor(outcome / bucketWidth) * bucketWidth;
    counts.set(bucketStart, (counts.get(bucketStart) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return [];
  }

  const percentileBuckets = percentileBucketStarts(outcomes, bucketWidth);
  let cumulativeCount = 0;
  return [...counts.entries()]
    .sort(([left], [right]) => right - left)
    .map(([bucketStart, count]) => {
      cumulativeCount += count;
      return {
        bucketStart,
        bucketEnd: bucketStart + bucketWidth,
        count: cumulativeCount,
        percent: cumulativeCount / total,
        percentiles: percentileBuckets.get(bucketStart) ?? []
      };
    })
    .sort((left, right) => left.bucketStart - right.bucketStart);
}

export function equityOutcomeStartDates(
  marketRows: MarketRow[],
  centerDate: string,
  windowSize = 1_000
): string[] {
  const dates = [...new Set(
    [...marketRows]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => row.date)
  )];
  if (dates.length === 0 || windowSize <= 0) {
    return [];
  }

  const foundCenterIndex = dates.findIndex((date) => date >= centerDate);
  const centerIndex = foundCenterIndex === -1 ? dates.length - 1 : foundCenterIndex;
  const sampleSize = Math.min(windowSize, dates.length);
  let startIndex = centerIndex - Math.floor(sampleSize / 2);
  startIndex = Math.max(0, Math.min(startIndex, dates.length - sampleSize));
  return dates.slice(startIndex, startIndex + sampleSize);
}

export function equityOutcomeCompleteStartDates(
  marketRows: MarketRow[],
  centerDate: string,
  horizonDays: number,
  windowSize = 1_000
): string[] {
  const sortedRows = [...marketRows].sort((left, right) => left.date.localeCompare(right.date));
  const latestDate = sortedRows.at(-1)?.date;
  if (!latestDate) {
    return [];
  }
  return equityOutcomeStartDates(sortedRows, centerDate, windowSize).filter(
    (startDate) => addDays(startDate, horizonDays) <= latestDate
  );
}

export function equityOutcomeHorizonDays(
  years = 10
): number {
  return Math.round(years * DAYS_PER_YEAR);
}

function shouldCapitalizeInterest(
  policy: CapitalizationPolicy,
  price: number,
  movingAverage120: number,
  equity: number
): boolean {
  switch (policy) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'negativeEquity':
      return equity < 0;
    case 'movingAverage':
      return price <= movingAverage120;
  }
}

function fillForwardPrimeRate(rows: PrimeRateRow[], date: string): number {
  let candidate: PrimeRateRow | undefined;
  for (const row of rows) {
    if (row.date > date) {
      break;
    }
    candidate = row;
  }
  if (!candidate) {
    return rows[0]?.annualRate ?? 0;
  }
  return candidate.annualRate;
}

function movingAverageByDate(rows: MarketRow[], windowSize: number): Map<string, number> {
  const averages = new Map<string, number>();
  const window: number[] = [];
  let total = 0;

  for (const row of rows) {
    window.push(row.close);
    total += row.close;
    if (window.length > windowSize) {
      total -= window.shift() ?? 0;
    }
    averages.set(row.date, total / window.length);
  }

  return averages;
}

function firstTradingDateByInterval(
  rows: MarketRow[],
  interval: SimulationInterval
): Set<string> {
  const dates = new Set<string>();
  let currentPeriod = '';
  for (const row of rows) {
    const period = periodKey(row.date, interval);
    if (period !== currentPeriod) {
      dates.add(row.date);
      currentPeriod = period;
    }
  }
  return dates;
}

function roundSharesToNearestBoardLot(shares: number): number {
  if (shares <= 0) {
    return 0;
  }
  return Math.round(shares / BOARD_LOT_SIZE) * BOARD_LOT_SIZE;
}

function drawdownToMaintenanceMarginCall(
  shareValue: number,
  cashBalance: number,
  marginDebt: number,
  maintenanceMarginRequirement: number
): number {
  if (shareValue <= 0 || marginDebt <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const maximumDebtRatio = 1 - maintenanceMarginRequirement;
  const requiredAccountAssets = marginDebt / maximumDebtRatio;
  const requiredShareValue = requiredAccountAssets - cashBalance;
  if (requiredShareValue <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, 1 - requiredShareValue / shareValue);
}

function percentileBucketStarts(outcomes: number[], bucketWidth: number): Map<number, number[]> {
  const sorted = [...outcomes].sort((left, right) => left - right);
  const buckets = new Map<number, number[]>();
  for (const percentile of [25, 50, 75]) {
    if (sorted.length === 0) {
      break;
    }
    const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);
    const bucketStart = Math.floor(sorted[index] / bucketWidth) * bucketWidth;
    buckets.set(bucketStart, [...(buckets.get(bucketStart) ?? []), percentile]);
  }
  return buckets;
}

function periodKey(date: string, interval: SimulationInterval): string {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  switch (interval) {
    case 'monthly':
      return date.slice(0, 7);
    case 'quarterly':
      return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    case 'annually':
      return year;
  }
}

function sum(rows: DcaSimulationRow[], key: keyof DcaSimulationRow): number {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);
}

function daysBetween(start: string, end: string): number {
  const milliseconds =
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(0, milliseconds / 86_400_000);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
