import { describe, expect, test } from 'vitest';

import {
  fixtureMarginRate,
  interestFixture,
  simpleInterestForDays
} from './interest-fixture';

describe('book interest examples', () => {
  test('prime 4.45% maps to margin 3.50%', () => {
    expect(fixtureMarginRate()).toBeCloseTo(interestFixture.expectedMarginRate, 8);
  });

  test('interest fixture uses daily simple interest', () => {
    expect(
      simpleInterestForDays(
        interestFixture.debt,
        interestFixture.expectedMarginRate,
        interestFixture.elapsedDays
      )
    ).toBeCloseTo(76.6598220397, 8);
  });
});
