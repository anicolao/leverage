import type { MarketRow } from '../../src/lib/backtest/marketData';
import {
  equityOutcomeBucketsFromOutcomes,
  equityOutcomeCompleteStartDates,
  equityOutcomeForStartDate,
  equityOutcomeHorizonDays,
  simulateDcaPortfolio,
  summarizeSimulationRows,
  type CapitalizationPolicy,
  type DcaSimulationInput
} from '../../src/lib/backtest/dcaSimulator';
import {
  DEFAULT_DCA_SCENARIO_PARAMETERS,
  defaultDcaSimulationInput
} from '../../src/lib/backtest/defaultScenario';
import { defaultScenarioPrimeRates, defaultScenarioStartDate } from '../examples/default-scenario';
import { realMarketComparison, realMarketFixture } from '../examples/market-fixture';
import './book-examples.css';

const money = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 2
});
const number = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-CA', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const demoRates = [{ date: '2025-01-01', annualRate: 0.06 }];

function defineElement(name: string, constructor: CustomElementConstructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function table(headers: string[], rows: Array<Array<string | number>>) {
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
        .join('')}</tbody>
    </table>
  `;
}

function metric(label: string, value: string) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function lineChart(
  rows: Array<{ date: string; actual: number; synthetic: number }>,
  options: { actualLabel: string; syntheticLabel: string; valueFormatter?: (value: number) => string }
) {
  const width = 820;
  const height = 280;
  const padding = { top: 18, right: 30, bottom: 32, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = rows.flatMap((row) => [row.actual, row.synthetic]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (index: number) => padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - min) / Math.max(max - min, 0.000001)) * plotHeight;
  const path = (key: 'actual' | 'synthetic') =>
    rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(row[key]).toFixed(1)}`).join(' ');
  const formatValue = options.valueFormatter ?? ((value: number) => number.format(value));
  const ticks = [min, (min + max) / 2, max];

  return `
    <figure class="comparison-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.actualLabel} compared with ${options.syntheticLabel}">
        ${ticks
          .map(
            (tick) => `
              <line class="grid-line" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}"></line>
              <text class="axis-label" x="${padding.left - 8}" y="${y(tick) + 4}" text-anchor="end">${formatValue(tick)}</text>
            `
          )
          .join('')}
        <path class="actual-line" d="${path('actual')}"></path>
        <path class="synthetic-line" d="${path('synthetic')}"></path>
        <text class="axis-label" x="${padding.left}" y="${height - 8}">${rows[0]?.date ?? ''}</text>
        <text class="axis-label" x="${width - padding.right}" y="${height - 8}" text-anchor="end">${rows.at(-1)?.date ?? ''}</text>
      </svg>
      <figcaption>
        <span><i class="actual-key"></i>${options.actualLabel}</span>
        <span><i class="synthetic-key"></i>${options.syntheticLabel}</span>
      </figcaption>
    </figure>
  `;
}

function baseInput(overrides: Partial<DcaSimulationInput> = {}): DcaSimulationInput {
  return {
    ...defaultDcaSimulationInput('2025-01-01', demoRates),
    investmentTarget: 100_000,
    monthlyContribution: 100_000,
    maxHelocDebt: 1_000_000,
    capitalizationPolicy: 'always',
    ...overrides
  };
}

function simpleMarketRows(): MarketRow[] {
  return [
    { date: '2025-01-02', close: 100, dividends: 0 },
    { date: '2025-02-03', close: 95, dividends: 1 },
    { date: '2025-03-03', close: 105, dividends: 0 }
  ];
}

class DefaultScenarioDemo extends HTMLElement {
  connectedCallback() {
    const input = defaultDcaSimulationInput(defaultScenarioStartDate, defaultScenarioPrimeRates);
    this.innerHTML = `
      <section class="demo">
        <h3>Default scenario values used by the app</h3>
        <div class="metrics">
          ${metric('Start date', input.startDate)}
          ${metric('Investment target', money.format(input.investmentTarget))}
          ${metric('Monthly investment', money.format(input.monthlyContribution))}
          ${metric('Margin leverage target', percent.format(input.leverageTarget))}
          ${metric('Max HELOC debt', money.format(input.maxHelocDebt))}
          ${metric('Capitalization policy', input.capitalizationPolicy)}
        </div>
        <p class="note">These values come from production defaults, so changing the app defaults changes this example.</p>
      </section>
    `;
  }
}

class SyntheticXawDemo extends HTMLElement {
  connectedCallback() {
    const fixture = realMarketFixture();
    const comparison = realMarketComparison();
    const sampleRows = comparison.rows.slice(0, 15);

    this.innerHTML = `
      <section class="demo">
        <h3>Actual 2023 XAW.TO overlap fixture</h3>
        <div class="metrics">
          ${metric('Fixture window', `${fixture.start} to ${fixture.end}`)}
          ${metric('Actual XAW rows', number.format(fixture.symbols['XAW.TO'].length))}
          ${metric('Comparable days', number.format(comparison.stats.overlapDays))}
          ${metric('Total-return correlation', comparison.stats.correlation.toFixed(4))}
          ${metric('Mean absolute error', percent.format(comparison.stats.meanAbsolutePercentError))}
          ${metric('Distribution drag calibration', percent.format(comparison.distributionTaxDrag))}
        </div>
        ${lineChart(
          comparison.rows.map((row) => ({
            date: row.date,
            actual: row.actualTotalReturn,
            synthetic: row.syntheticTotalReturn
          })),
          {
            actualLabel: 'Actual XAW.TO total return',
            syntheticLabel: 'Synthetic total return',
            valueFormatter: (value) => number.format(value)
          }
        )}
        <div class="table-wrap">
          ${table(
            ['Date', 'Actual XAW close', 'Synthetic price', 'Actual total return', 'Synthetic total return'],
            sampleRows.map((row) => [
              row.date,
              money.format(row.actualPrice),
              money.format(row.syntheticPrice),
              number.format(row.actualTotalReturn),
              number.format(row.syntheticTotalReturn)
            ])
          )}
        </div>
        <p class="note">Rows are stored Yahoo Finance close and dividend data. The chart and table call the same proxy, scaling, total-return, and comparison helpers as the production app.</p>
      </section>
    `;
  }
}

class ReturnDistributionDemo extends HTMLElement {
  connectedCallback() {
    const comparison = realMarketComparison();
    const distributionRows = comparison.rows.filter(
      (row) => row.actualDistribution > 0 || row.syntheticDistribution > 0
    );
    const sampleRows = [
      ...comparison.rows.slice(0, 5),
      ...distributionRows,
      ...comparison.rows.slice(-5)
    ].filter((row, index, rows) => rows.findIndex((candidate) => candidate.date === row.date) === index);

    this.innerHTML = `
      <section class="demo">
        <h3>Real price, distributions, and total return</h3>
        ${lineChart(
          comparison.rows.map((row) => ({
            date: row.date,
            actual: row.actualPrice,
            synthetic: row.syntheticPrice
          })),
          {
            actualLabel: 'Actual XAW.TO close',
            syntheticLabel: 'Scaled synthetic price',
            valueFormatter: (value) => money.format(value)
          }
        )}
        <div class="table-wrap">
          ${table(
            ['Date', 'Actual close', 'Actual distribution', 'Actual total return', 'Synthetic distribution'],
            sampleRows.map((row) => [
              row.date,
              money.format(row.actualPrice),
              money.format(row.actualDistribution),
              number.format(row.actualTotalReturn),
              money.format(row.syntheticDistribution)
            ])
          )}
        </div>
        ${table(
          ['Year', 'Actual XAW distributions', 'Synthetic proxy distributions'],
          comparison.distributions.actual.map((row, index) => [
            row.date,
            money.format(row.close),
            money.format(comparison.distributions.synthetic[index]?.close ?? 0)
          ])
        )}
        <p class="note">The distribution rows come from stored Yahoo dividend events. Total return is recomputed from the actual XAW close and dividend rows instead of using an invented three-row example.</p>
      </section>
    `;
  }
}

class MonthlyStepDemo extends HTMLElement {
  connectedCallback() {
    const rows = simulateDcaPortfolio(simpleMarketRows(), baseInput());
    this.innerHTML = `
      <section class="demo">
        <h3>Monthly checkpoints from a three-row market fixture</h3>
        ${table(
          ['Date', 'Contribution', 'Margin interest', 'HELOC interest', 'Distributions', 'Equity'],
          rows.map((row) => [
            row.date,
            money.format(row.contribution),
            money.format(row.marginInterestOwing),
            money.format(row.helocInterestOwing),
            money.format(row.distributionsPaid),
            money.format(row.equity)
          ])
        )}
      </section>
    `;
  }
}

class ContributionDemo extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  private render() {
    const target = Number(this.querySelector<HTMLInputElement>('[name="target"]')?.value ?? 250_000);
    const monthly = Number(this.querySelector<HTMLInputElement>('[name="monthly"]')?.value ?? 100_000);
    const rows = simulateDcaPortfolio(
      [
        { date: '2025-01-02', close: 100, dividends: 0 },
        { date: '2025-02-03', close: 100, dividends: 0 },
        { date: '2025-03-03', close: 100, dividends: 0 },
        { date: '2025-04-01', close: 100, dividends: 0 }
      ],
      baseInput({ investmentTarget: target, monthlyContribution: monthly })
    );
    this.innerHTML = `
      <section class="demo">
        <h3>Contribution stopping rule</h3>
        <div class="controls">
          <label>Investment target<input name="target" type="number" step="10000" value="${target}"></label>
          <label>Monthly investment<input name="monthly" type="number" step="10000" value="${monthly}"></label>
        </div>
        ${table(
          ['Date', 'Contribution', 'Cumulative contribution', 'HELOC debt'],
          rows.map((row) => [
            row.date,
            money.format(row.contribution),
            money.format(row.cumulativeContribution),
            money.format(row.helocDebt)
          ])
        )}
      </section>
    `;
    this.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => this.render()));
  }
}

class LeverageBoardLotDemo extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  private render() {
    const price = Number(this.querySelector<HTMLInputElement>('[name="price"]')?.value ?? 97);
    const leveragePercent = Number(this.querySelector<HTMLInputElement>('[name="leverage"]')?.value ?? 20);
    const leverageTarget = leveragePercent / 100;
    const rows = simulateDcaPortfolio(
      [{ date: '2025-01-02', close: price, dividends: 0 }],
      baseInput({ leverageTarget })
    );
    const row = rows[0];
    this.innerHTML = `
      <section class="demo">
        <h3>Leverage target with 100-share board-lot rounding</h3>
        <div class="controls">
          <label>Proxy price<input name="price" type="number" step="1" value="${price}"></label>
          <label>Leverage target %<input name="leverage" type="number" min="0" max="95" step="1" value="${leveragePercent}"></label>
        </div>
        <div class="metrics">
          ${metric('Shares after rounding', number.format(row.shares))}
          ${metric('Trade amount', money.format(row.tradeAmount))}
          ${metric('Share value', money.format(row.shareValue))}
          ${metric('Margin debt', money.format(row.marginDebt))}
          ${metric('Actual margin leverage', percent.format(row.leverage))}
          ${metric('Cash balance', money.format(row.cashBalance))}
        </div>
      </section>
    `;
    this.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => this.render()));
  }
}

class InterestPolicyDemo extends HTMLElement {
  connectedCallback() {
    const market = [
      { date: '2025-01-02', close: 100, dividends: 0 },
      { date: '2025-02-03', close: 90, dividends: 0 }
    ];
    const policies: CapitalizationPolicy[] = ['always', 'never', 'movingAverage', 'negativeEquity'];
    const rows = policies.map((policy) => {
      const result = simulateDcaPortfolio(market, baseInput({ capitalizationPolicy: policy }));
      return { policy, row: result[1] };
    });
    this.innerHTML = `
      <section class="demo">
        <h3>Same market path, different margin-interest policies</h3>
        ${table(
          ['Policy', 'Margin interest', 'Sold for margin interest', 'Capitalized to HELOC', 'HELOC debt'],
          rows.map(({ policy, row }) => [
            policy,
            money.format(row.marginInterestOwing),
            money.format(row.interestPaidBySale),
            money.format(row.interestCapitalized),
            money.format(row.helocDebt)
          ])
        )}
      </section>
    `;
  }
}

class HelocCapDemo extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  private render() {
    const cap = Number(this.querySelector<HTMLInputElement>('[name="cap"]')?.value ?? 80_000);
    const row = simulateDcaPortfolio(
      [{ date: '2025-01-02', close: 100, dividends: 0 }],
      baseInput({ maxHelocDebt: cap })
    )[0];
    this.innerHTML = `
      <section class="demo">
        <h3>HELOC cap pressure</h3>
        <div class="controls">
          <label>Max HELOC debt<input name="cap" type="number" step="10000" value="${cap}"></label>
        </div>
        <div class="metrics">
          ${metric('HELOC debt after enforcement', money.format(row.helocDebt))}
          ${metric('Over-limit shares sold', money.format(row.helocLimitPaidBySale))}
          ${metric('Remaining HELOC capacity', money.format(row.remainingHelocCapacity))}
          ${metric('Shares left', number.format(row.shares))}
        </div>
      </section>
    `;
    this.querySelector('input')?.addEventListener('input', () => this.render());
  }
}

class TaxDeductionDemo extends HTMLElement {
  connectedCallback() {
    const rows = simulateDcaPortfolio(
      [
        { date: '2025-01-02', close: 125, dividends: 0 },
        { date: '2025-01-15', close: 125, dividends: 1.5 },
        { date: '2025-02-03', close: 125, dividends: 0 }
      ],
      baseInput()
    );
    const row = rows[1];
    this.innerHTML = `
      <section class="demo">
        <h3>Tax deduction tracking on a distribution month</h3>
        <div class="metrics">
          ${metric('Interest owing', money.format(row.interestOwing))}
          ${metric('Distributions paid', money.format(row.distributionsPaid))}
          ${metric('Tracked tax deduction', money.format(row.taxDeduction))}
          ${metric('Formula', 'interest - distributions')}
        </div>
      </section>
    `;
  }
}

class DrawdownDemo extends HTMLElement {
  connectedCallback() {
    const row = simulateDcaPortfolio(
      [{ date: '2025-01-02', close: 125, dividends: 0 }],
      baseInput({ maxHelocDebt: 120_000 })
    )[0];
    this.innerHTML = `
      <section class="demo">
        <h3>Drawdown fields from a single checkpoint</h3>
        <div class="metrics">
          ${metric('Share value', money.format(row.shareValue))}
          ${metric('Margin debt', money.format(row.marginDebt))}
          ${metric('Remaining HELOC capacity', money.format(row.remainingHelocCapacity))}
          ${metric('Margin-call drawdown', percent.format(row.marginCallDrawdown))}
          ${metric('Collapse drawdown', percent.format(row.collapseDrawdown))}
        </div>
      </section>
    `;
  }
}

class CheckpointSummaryDemo extends HTMLElement {
  connectedCallback() {
    const rows = simulateDcaPortfolio(
      [
        { date: '2025-01-02', close: 100, dividends: 0 },
        { date: '2025-02-03', close: 100, dividends: 0.5 },
        { date: '2025-04-01', close: 105, dividends: 0 }
      ],
      baseInput({ investmentTarget: 300_000 })
    );
    const quarterly = summarizeSimulationRows(rows, 'quarterly');
    this.innerHTML = `
      <section class="demo">
        <h3>Monthly rows summarized as quarterly table rows</h3>
        ${table(
          ['Interval', 'Rows', 'Contribution total', 'Last equity'],
          [
            ['Monthly', rows.length, money.format(rows.reduce((total, row) => total + row.contribution, 0)), money.format(rows.at(-1)?.equity ?? 0)],
            ['Quarterly', quarterly.length, money.format(quarterly.reduce((total, row) => total + row.contribution, 0)), money.format(quarterly.at(-1)?.equity ?? 0)]
          ]
        )}
      </section>
    `;
  }
}

class OutcomeHistogramDemo extends HTMLElement {
  connectedCallback() {
    const market = [
      { date: '2025-01-02', close: 120, dividends: 0 },
      { date: '2025-02-03', close: 100, dividends: 0 },
      { date: '2025-03-03', close: 80, dividends: 0 },
      { date: '2025-04-01', close: 120, dividends: 0 }
    ];
    const input = baseInput();
    const horizonDays = 29;
    const starts = equityOutcomeCompleteStartDates(market, '2025-02-03', horizonDays, 4);
    const outcomes = starts.flatMap((startDate) => {
      const equity = equityOutcomeForStartDate(market, input, startDate, horizonDays);
      return equity === undefined ? [] : [equity];
    });
    const buckets = equityOutcomeBucketsFromOutcomes(outcomes, 25_000);
    this.innerHTML = `
      <section class="demo">
        <h3>Outcome buckets from four possible starts</h3>
        <div class="metrics">
          ${metric('Complete starts', starts.join(', '))}
          ${metric('10-year horizon days', number.format(equityOutcomeHorizonDays(10)))}
        </div>
        ${table(
          ['Bucket lower bound', 'Cumulative count', 'Cumulative percent', 'Percentile markers'],
          buckets.map((bucket) => [
            money.format(bucket.bucketStart),
            bucket.count,
            percent.format(bucket.percent),
            bucket.percentiles.map((value) => `P${value}`).join(', ') || '-'
          ])
        )}
      </section>
    `;
  }
}

defineElement('default-scenario-demo', DefaultScenarioDemo);
defineElement('synthetic-xaw-demo', SyntheticXawDemo);
defineElement('return-distribution-demo', ReturnDistributionDemo);
defineElement('monthly-step-demo', MonthlyStepDemo);
defineElement('contribution-demo', ContributionDemo);
defineElement('leverage-board-lot-demo', LeverageBoardLotDemo);
defineElement('interest-policy-demo', InterestPolicyDemo);
defineElement('heloc-cap-demo', HelocCapDemo);
defineElement('tax-deduction-demo', TaxDeductionDemo);
defineElement('drawdown-demo', DrawdownDemo);
defineElement('checkpoint-summary-demo', CheckpointSummaryDemo);
defineElement('outcome-histogram-demo', OutcomeHistogramDemo);
