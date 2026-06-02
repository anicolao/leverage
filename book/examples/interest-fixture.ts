import { marginRateFromPrime } from '../../src/lib/backtest/dcaSimulator';

export const interestFixture = {
  primeRate: 0.0445,
  expectedMarginRate: 0.035,
  debt: 25_000,
  elapsedDays: 32
};

export function annualRatePercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function simpleInterestForDays(
  principal: number,
  annualRate: number,
  elapsedDays: number
): number {
  return principal * annualRate * (elapsedDays / 365.25);
}

export function fixtureMarginRate(): number {
  return marginRateFromPrime(interestFixture.primeRate);
}
