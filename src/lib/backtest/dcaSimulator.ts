import type { MarketRow } from './marketData';
import type { PrimeRateRow } from './bankOfCanada';

export type DcaSimulationInput = {
  startDate: string;
  investmentTarget: number;
  monthlyContribution: number;
  leverageTarget: number;
  primeRates: PrimeRateRow[];
  capitalizationPolicy: CapitalizationPolicy;
};

export type CapitalizationPolicy = 'never' | 'movingAverage' | 'negativeEquity' | 'always';

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
  interestPaidBySale: number;
  interestCapitalized: number;
  shares: number;
  shareValue: number;
  marginDebt: number;
  helocDebt: number;
  totalDebt: number;
  equity: number;
  leverage: number;
};

const DAYS_PER_YEAR = 365.25;

export function simulateDcaPortfolio(
  marketRows: MarketRow[],
  input: DcaSimulationInput
): DcaSimulationRow[] {
  const sortedRows = [...marketRows].sort((left, right) => left.date.localeCompare(right.date));
  const movingAverages = movingAverageByDate(sortedRows, 120);
  const rows = sortedRows.filter((row) => row.date >= input.startDate);
  const monthlyDates = firstTradingDateByMonth(rows);
  const primeRates = [...input.primeRates].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const results: DcaSimulationRow[] = [];

  let shares = 0;
  let marginDebt = 0;
  let helocDebt = 0;
  let cumulativeContribution = 0;
  let pendingInterest = 0;
  let pendingDistributions = 0;
  let previousDate = rows[0]?.date;

  for (const row of rows) {
    if (previousDate !== undefined) {
      const elapsedDays = daysBetween(previousDate, row.date);
      const primeRate = fillForwardPrimeRate(primeRates, previousDate);
      pendingInterest += (marginDebt + helocDebt) * primeRate * (elapsedDays / DAYS_PER_YEAR);
    }
    pendingDistributions += shares * row.dividends;

    if (monthlyDates.has(row.date)) {
      const movingAverage120 = movingAverages.get(row.date) ?? row.close;
      const primeRate = fillForwardPrimeRate(primeRates, row.date);
      const interestOwing = pendingInterest;
      let interestPaidBySale = 0;
      let interestCapitalized = 0;

      if (interestOwing > 0) {
        const shareValueBeforeInterest = shares * row.close;
        const equityBeforeInterest = shareValueBeforeInterest - marginDebt - helocDebt;
        const shouldCapitalize = shouldCapitalizeInterest(
          input.capitalizationPolicy,
          row.close,
          movingAverage120,
          equityBeforeInterest
        );

        if (!shouldCapitalize && shares > 0) {
          interestPaidBySale = Math.min(interestOwing, shares * row.close);
          shares -= interestPaidBySale / row.close;
          interestCapitalized = interestOwing - interestPaidBySale;
          helocDebt += interestCapitalized;
        } else {
          interestCapitalized = interestOwing;
          helocDebt += interestCapitalized;
        }
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
      const tradeAmount = desiredShareValue - shareValueBeforeTrade;
      const shareDelta = tradeAmount / row.close;
      shares = Math.max(0, shares + shareDelta);

      marginDebt = desiredMarginDebt;

      const shareValue = shares * row.close;
      const totalDebt = marginDebt + helocDebt;
      const equity = shareValue - totalDebt;
      results.push({
        date: row.date,
        price: row.close,
        movingAverage120,
        contribution,
        cumulativeContribution,
        tradeAmount,
        shareDelta,
        distributionsPaid: pendingDistributions,
        primeRate,
        interestOwing,
        interestPaidBySale,
        interestCapitalized,
        shares,
        shareValue,
        marginDebt,
        helocDebt,
        totalDebt,
        equity,
        leverage: shareValue === 0 ? 0 : marginDebt / shareValue
      });

      pendingInterest = 0;
      pendingDistributions = 0;
    }

    previousDate = row.date;
  }

  return results;
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

function firstTradingDateByMonth(rows: MarketRow[]): Set<string> {
  const dates = new Set<string>();
  let currentMonth = '';
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (month !== currentMonth) {
      dates.add(row.date);
      currentMonth = month;
    }
  }
  return dates;
}

function daysBetween(start: string, end: string): number {
  const milliseconds =
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(0, milliseconds / 86_400_000);
}
