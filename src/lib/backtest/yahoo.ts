import type { MarketRow } from './marketData';

type YahooChartResult = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
    }>;
  };
  events?: {
    dividends?: Record<string, { amount: number; date: number }>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: YahooChartResult[];
    error?: { description?: string };
  };
};

export async function fetchYahooHistory(
  symbol: string,
  startDate: string,
  endDate = todayIso()
): Promise<MarketRow[]> {
  const period1 = toUnixSeconds(startDate);
  const period2 = toUnixSeconds(addDays(endDate, 1));
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('events', 'div');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${symbol}: ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  if (!result) {
    throw new Error(payload.chart?.error?.description ?? `No Yahoo chart result for ${symbol}`);
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const dividendsByDate = new Map<string, number>();
  for (const dividend of Object.values(result.events?.dividends ?? {})) {
    const date = toIsoDate(dividend.date);
    dividendsByDate.set(date, (dividendsByDate.get(date) ?? 0) + dividend.amount);
  }

  const rows: MarketRow[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    if (close === null || close === undefined || !Number.isFinite(close)) {
      continue;
    }
    const date = toIsoDate(timestamps[index]);
    rows.push({
      date,
      close,
      dividends: dividendsByDate.get(date) ?? 0
    });
  }

  return rows;
}

function toUnixSeconds(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
