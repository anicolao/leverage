export type PrimeRateRow = {
  date: string;
  annualRate: number;
};

type ValetObservation = {
  d: string;
  V80691311?: {
    v: string;
  };
};

type ValetResponse = {
  observations?: ValetObservation[];
};

const PRIME_RATE_SERIES = 'V80691311';

export async function fetchCanadianPrimeRates(startDate: string): Promise<PrimeRateRow[]> {
  const url = new URL(
    `https://www.bankofcanada.ca/valet/observations/${PRIME_RATE_SERIES}/json`
  );
  url.searchParams.set('start_date', startDate);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bank of Canada prime-rate request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ValetResponse;
  const rows =
    payload.observations?.flatMap((observation) => {
      const value = observation.V80691311?.v;
      if (value === undefined) {
        return [];
      }
      return [
        {
          date: observation.d,
          annualRate: Number(value) / 100
        }
      ];
    }) ?? [];

  if (rows.length === 0) {
    throw new Error('No Bank of Canada prime-rate observations returned');
  }

  return rows;
}
