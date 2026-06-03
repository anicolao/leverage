import { SINGLE_TICKER_STRATEGIES } from '../../src/lib/backtest/marketData';
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
import { part3XawSimulationRows } from '../examples/part3-market';
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

function formatWeights(weights: Record<string, number>) {
  return Object.entries(weights)
    .map(([symbol, weight]) => `${percent.format(weight)} ${symbol}`)
    .join(', ');
}

function lineChart(
  rows: Array<{ date: string; actual: number; synthetic: number }>,
  options: { actualLabel: string; syntheticLabel: string; valueFormatter?: (value: number) => string }
) {
  const width = 820;
  const height = 304;
  const padding = { top: 48, right: 30, bottom: 34, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = rows.flatMap((row) => [row.actual, row.synthetic]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const domainPadding = Math.max((rawMax - rawMin) * 0.06, 0.000001);
  const min = rawMin - domainPadding;
  const max = rawMax + domainPadding;
  const x = (index: number) => padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - min) / Math.max(max - min, 0.000001)) * plotHeight;
  const path = (key: 'actual' | 'synthetic') =>
    rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(row[key]).toFixed(1)}`).join(' ');
  const formatValue = options.valueFormatter ?? ((value: number) => number.format(value));
  const ticks = [rawMin, (rawMin + rawMax) / 2, rawMax];
  const actualColor = '#1f6fb2';
  const syntheticColor = '#a64d00';

  return `
    <figure class="comparison-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.actualLabel} compared with ${options.syntheticLabel}">
        <rect class="plot-background" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="4"></rect>
        ${ticks
          .map(
            (tick) => `
              <line class="grid-line" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" stroke="#dce3ea" stroke-width="1"></line>
              <text class="axis-label" x="${padding.left - 8}" y="${y(tick) + 4}" text-anchor="end">${formatValue(tick)}</text>
            `
          )
          .join('')}
        <line class="axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        <path class="actual-line" d="${path('actual')}" fill="none" stroke="${actualColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
        <path class="synthetic-line" d="${path('synthetic')}" fill="none" stroke="${syntheticColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
        <g class="chart-legend" transform="translate(${padding.left}, 18)">
          <line x1="0" y1="7" x2="26" y2="7" stroke="${actualColor}" stroke-width="3" stroke-linecap="round"></line>
          <text x="34" y="11">${options.actualLabel}</text>
          <line x1="260" y1="7" x2="286" y2="7" stroke="${syntheticColor}" stroke-width="3" stroke-linecap="round"></line>
          <text x="294" y="11">${options.syntheticLabel}</text>
        </g>
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

function multiLineChart<T extends { date: string }>(
  rows: T[],
  series: Array<{ key: keyof T & string; label: string; color: string }>,
  options: { valueFormatter?: (value: number) => string }
) {
  const width = 820;
  const height = 324;
  const padding = { top: 66, right: 30, bottom: 34, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = rows.flatMap((row) => series.map((item) => Number(row[item.key])));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const domainPadding = Math.max((rawMax - rawMin) * 0.06, 0.000001);
  const min = rawMin - domainPadding;
  const max = rawMax + domainPadding;
  const x = (index: number) => padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - min) / Math.max(max - min, 0.000001)) * plotHeight;
  const path = (key: keyof T & string) =>
    rows
      .map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(Number(row[key])).toFixed(1)}`)
      .join(' ');
  const formatValue = options.valueFormatter ?? ((value: number) => number.format(value));
  const ticks = [rawMin, (rawMin + rawMax) / 2, rawMax];

  return `
    <figure class="comparison-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.map((item) => item.label).join(' compared with ')}">
        <rect class="plot-background" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="4"></rect>
        ${ticks
          .map(
            (tick) => `
              <line class="grid-line" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" stroke="#dce3ea" stroke-width="1"></line>
              <text class="axis-label" x="${padding.left - 8}" y="${y(tick) + 4}" text-anchor="end">${formatValue(tick)}</text>
            `
          )
          .join('')}
        <line class="axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        ${series
          .map(
            (item) =>
              `<path d="${path(item.key)}" fill="none" stroke="${item.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>`
          )
          .join('')}
        <g class="chart-legend" transform="translate(${padding.left}, 16)">
          ${series
            .map(
              (item, index) => `
                <g transform="translate(${(index % 2) * 320}, ${Math.floor(index / 2) * 20})">
                  <line x1="0" y1="7" x2="26" y2="7" stroke="${item.color}" stroke-width="3" stroke-linecap="round"></line>
                  <text x="34" y="11">${item.label}</text>
                </g>
              `
            )
            .join('')}
        </g>
        <text class="axis-label" x="${padding.left}" y="${height - 8}">${rows[0]?.date ?? ''}</text>
        <text class="axis-label" x="${width - padding.right}" y="${height - 8}" text-anchor="end">${rows.at(-1)?.date ?? ''}</text>
      </svg>
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

function representativeRows<T>(rows: T[], count = 6): T[] {
  if (rows.length <= count) {
    return rows;
  }
  const step = (rows.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => rows[Math.round(index * step)]);
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

class StrategyConfigDemo extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="demo">
        <h3>Configured single-ticker strategies</h3>
        <div class="table-wrap">
          ${table(
            ['Strategy', 'Actual ticker', 'Actual data starts', 'MER', 'Synthetic proxy mix', 'Notes'],
            Object.entries(SINGLE_TICKER_STRATEGIES).map(([key, strategy]) => [
              key,
              strategy.ticker,
              strategy.inceptionDate,
              percent.format(strategy.expenseRatio),
              formatWeights(strategy.syntheticWeights),
              strategy.notes
            ])
          )}
        </div>
        <p class="note">This table imports the same strategy map as the production app. When the app changes a ticker, inception date, or proxy weight, the book table changes with it.</p>
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
    const fixture = realMarketFixture();
    const rows = part3XawSimulationRows();
    this.innerHTML = `
      <section class="demo">
        <h3>Monthly checkpoints from real 2023 XAW.TO rows</h3>
        <div class="metrics">
          ${metric('Daily fixture window', `${fixture.start} to ${fixture.end}`)}
          ${metric('Daily XAW rows', number.format(fixture.symbols['XAW.TO'].length))}
          ${metric('Monthly checkpoints', number.format(rows.length))}
          ${metric('Ending equity', money.format(rows.at(-1)?.equity ?? 0))}
        </div>
        ${multiLineChart(
          rows.map((row) => ({
            date: row.date,
            shareValue: row.shareValue,
            debt: row.totalDebt,
            equity: row.equity
          })),
          [
            { key: 'shareValue', label: 'Share value', color: '#1f6fb2' },
            { key: 'debt', label: 'Total debt', color: '#7a4fb3' },
            { key: 'equity', label: 'Equity', color: '#0f7f5f' }
          ],
          { valueFormatter: (value) => money.format(value) }
        )}
        <div class="table-wrap">
        ${table(
          ['Date', 'XAW close', 'Contribution', 'Margin interest', 'HELOC interest', 'Distributions', 'Equity'],
          representativeRows(rows).map((row) => [
            row.date,
            money.format(row.price),
            money.format(row.contribution),
            money.format(row.marginInterestOwing),
            money.format(row.helocInterestOwing),
            money.format(row.distributionsPaid),
            money.format(row.equity)
          ])
        )}
        </div>
        <p class="note">The simulator reads every stored XAW.TO trading day, accrues interest between those days, and records only the first trading day of each month.</p>
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
    const monthly = Number(this.querySelector<HTMLInputElement>('[name="monthly"]')?.value ?? 50_000);
    const rows = part3XawSimulationRows({ investmentTarget: target, monthlyContribution: monthly });
    this.innerHTML = `
      <section class="demo">
        <h3>Contribution target on real XAW.TO checkpoints</h3>
        <div class="controls">
          <label>Investment target<input name="target" type="number" step="10000" value="${target}"></label>
          <label>Monthly investment<input name="monthly" type="number" step="10000" value="${monthly}"></label>
        </div>
        ${multiLineChart(
          rows.map((row) => ({
            date: row.date,
            cumulativeContribution: row.cumulativeContribution,
            helocDebt: row.helocDebt
          })),
          [
            { key: 'cumulativeContribution', label: 'Cumulative contribution', color: '#1f6fb2' },
            { key: 'helocDebt', label: 'HELOC debt', color: '#7a4fb3' }
          ],
          { valueFormatter: (value) => money.format(value) }
        )}
        <div class="table-wrap">
        ${table(
          ['Date', 'XAW close', 'Contribution', 'Cumulative contribution', 'HELOC debt'],
          rows.map((row) => [
            row.date,
            money.format(row.price),
            money.format(row.contribution),
            money.format(row.cumulativeContribution),
            money.format(row.helocDebt)
          ])
        )}
        </div>
        <p class="note">Changing the target or monthly draw recomputes the production contribution rule against the same stored XAW.TO daily fixture.</p>
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
    const leveragePercent = Number(this.querySelector<HTMLInputElement>('[name="leverage"]')?.value ?? 20);
    const leverageTarget = leveragePercent / 100;
    const rows = part3XawSimulationRows({ leverageTarget });
    const row = rows.at(-1);
    this.innerHTML = `
      <section class="demo">
        <h3>Board-lot rounding on real XAW.TO prices</h3>
        <div class="controls">
          <label>Leverage target %<input name="leverage" type="number" min="0" max="95" step="1" value="${leveragePercent}"></label>
        </div>
        <div class="metrics">
          ${metric('Latest checkpoint', row?.date ?? '-')}
          ${metric('Latest XAW close', money.format(row?.price ?? 0))}
          ${metric('Shares after rounding', number.format(row?.shares ?? 0))}
          ${metric('Actual margin leverage', percent.format(row?.leverage ?? 0))}
        </div>
        ${lineChart(
          rows.map((checkpoint) => ({
            date: checkpoint.date,
            actual: checkpoint.leverage,
            synthetic: leverageTarget
          })),
          {
            actualLabel: 'Actual leverage after rounding',
            syntheticLabel: 'Selected target',
            valueFormatter: (value) => percent.format(value)
          }
        )}
        <div class="table-wrap">
          ${table(
            ['Date', 'XAW close', 'Shares', 'Trade amount', 'Cash balance', 'Actual leverage'],
            representativeRows(rows).map((checkpoint) => [
              checkpoint.date,
              money.format(checkpoint.price),
              number.format(checkpoint.shares),
              money.format(checkpoint.tradeAmount),
              money.format(checkpoint.cashBalance),
              percent.format(checkpoint.leverage)
            ])
          )}
        </div>
        <p class="note">The target line is flat because it is the selected input. The actual line moves because 100-share rounding and changing XAW prices leave small residual cash balances.</p>
      </section>
    `;
    this.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => this.render()));
  }
}

class DebtEquityDemo extends HTMLElement {
  connectedCallback() {
    const rows = part3XawSimulationRows();
    const last = rows.at(-1);
    this.innerHTML = `
      <section class="demo">
        <h3>Debt and equity through a real XAW.TO year</h3>
        <div class="metrics">
          ${metric('Ending share value', money.format(last?.shareValue ?? 0))}
          ${metric('Ending margin debt', money.format(last?.marginDebt ?? 0))}
          ${metric('Ending HELOC debt', money.format(last?.helocDebt ?? 0))}
          ${metric('Ending equity', money.format(last?.equity ?? 0))}
        </div>
        ${multiLineChart(
          rows.map((row) => ({
            date: row.date,
            shareValue: row.shareValue,
            marginDebt: row.marginDebt,
            helocDebt: row.helocDebt,
            equity: row.equity
          })),
          [
            { key: 'shareValue', label: 'Share value', color: '#1f6fb2' },
            { key: 'marginDebt', label: 'Margin debt', color: '#a64d00' },
            { key: 'helocDebt', label: 'HELOC debt', color: '#7a4fb3' },
            { key: 'equity', label: 'Equity', color: '#0f7f5f' }
          ],
          { valueFormatter: (value) => money.format(value) }
        )}
        <div class="table-wrap">
          ${table(
            ['Date', 'Share value', 'Margin debt', 'HELOC debt', 'Total debt', 'Equity'],
            representativeRows(rows).map((row) => [
              row.date,
              money.format(row.shareValue),
              money.format(row.marginDebt),
              money.format(row.helocDebt),
              money.format(row.totalDebt),
              money.format(row.equity)
            ])
          )}
        </div>
        <p class="note">Margin debt is the brokerage loan used for leverage targeting. HELOC debt funds contributions and capitalized interest, so it affects equity but not the broker leverage ratio.</p>
      </section>
    `;
  }
}

class InterestPolicyDemo extends HTMLElement {
  connectedCallback() {
    const policies: CapitalizationPolicy[] = ['always', 'never', 'movingAverage', 'negativeEquity'];
    const results = policies.map((policy) => {
      const rows = part3XawSimulationRows({ capitalizationPolicy: policy });
      return { policy, rows, row: rows.at(-1) };
    });
    this.innerHTML = `
      <section class="demo">
        <h3>Same real XAW.TO path, different margin-interest policies</h3>
        ${multiLineChart(
          part3XawSimulationRows().map((row, index) => ({
            date: row.date,
            always: results.find((result) => result.policy === 'always')?.rows[index]?.helocDebt ?? 0,
            never: results.find((result) => result.policy === 'never')?.rows[index]?.helocDebt ?? 0,
            movingAverage: results.find((result) => result.policy === 'movingAverage')?.rows[index]?.helocDebt ?? 0,
            negativeEquity: results.find((result) => result.policy === 'negativeEquity')?.rows[index]?.helocDebt ?? 0
          })),
          [
            { key: 'always', label: 'Always capitalize', color: '#1f6fb2' },
            { key: 'never', label: 'Never capitalize', color: '#a64d00' },
            { key: 'movingAverage', label: 'Below moving average', color: '#0f7f5f' },
            { key: 'negativeEquity', label: 'Negative equity', color: '#7a4fb3' }
          ],
          { valueFormatter: (value) => money.format(value) }
        )}
        <div class="table-wrap">
        ${table(
          ['Policy', 'Ending margin interest', 'Sold for margin interest', 'Capitalized to HELOC', 'Ending HELOC debt'],
          results.map(({ policy, row }) => [
            policy,
            money.format(row?.marginInterestOwing ?? 0),
            money.format(row?.interestPaidBySale ?? 0),
            money.format(row?.interestCapitalized ?? 0),
            money.format(row?.helocDebt ?? 0)
          ])
        )}
        </div>
        <p class="note">Each policy sees the same XAW.TO prices and distributions. Only the rule for unpaid margin interest changes.</p>
      </section>
    `;
  }
}

class HelocCapDemo extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  private render() {
    const cap = Number(this.querySelector<HTMLInputElement>('[name="cap"]')?.value ?? 180_000);
    const rows = part3XawSimulationRows({ maxHelocDebt: cap, investmentTarget: 300_000, monthlyContribution: 50_000 });
    const row = rows.at(-1);
    this.innerHTML = `
      <section class="demo">
        <h3>HELOC cap pressure on real XAW.TO checkpoints</h3>
        <div class="controls">
          <label>Max HELOC debt<input name="cap" type="number" step="10000" value="${cap}"></label>
        </div>
        ${lineChart(
          rows.map((checkpoint) => ({
            date: checkpoint.date,
            actual: checkpoint.helocDebt,
            synthetic: cap
          })),
          {
            actualLabel: 'HELOC debt after enforcement',
            syntheticLabel: 'Configured cap',
            valueFormatter: (value) => money.format(value)
          }
        )}
        <div class="metrics">
          ${metric('Ending HELOC debt', money.format(row?.helocDebt ?? 0))}
          ${metric('Total over-limit sales', money.format(rows.reduce((total, checkpoint) => total + checkpoint.helocLimitPaidBySale, 0)))}
          ${metric('Remaining HELOC capacity', money.format(row?.remainingHelocCapacity ?? 0))}
          ${metric('Shares left', number.format(row?.shares ?? 0))}
        </div>
        <div class="table-wrap">
          ${table(
            ['Date', 'XAW close', 'HELOC debt', 'Over-limit sale', 'Remaining capacity'],
            rows
              .filter((checkpoint) => checkpoint.helocLimitPaidBySale > 0 || checkpoint.date === rows[0].date || checkpoint.date === row?.date)
              .map((checkpoint) => [
                checkpoint.date,
                money.format(checkpoint.price),
                money.format(checkpoint.helocDebt),
                money.format(checkpoint.helocLimitPaidBySale),
                money.format(checkpoint.remainingHelocCapacity)
              ])
          )}
        </div>
        <p class="note">The chart stays at or below the cap because any overage is immediately paid down by selling shares at that checkpoint price.</p>
      </section>
    `;
    this.querySelector('input')?.addEventListener('input', () => this.render());
  }
}

class TaxDeductionDemo extends HTMLElement {
  connectedCallback() {
    const rows = part3XawSimulationRows();
    const distributionRows = rows.filter((row) => row.distributionsPaid > 0);
    const row = distributionRows.at(-1) ?? rows.at(-1);
    this.innerHTML = `
      <section class="demo">
        <h3>Tax deduction tracking on real XAW.TO distribution checkpoints</h3>
        ${multiLineChart(
          rows.map((checkpoint) => ({
            date: checkpoint.date,
            interestOwing: checkpoint.interestOwing,
            distributionsPaid: checkpoint.distributionsPaid,
            taxDeduction: checkpoint.taxDeduction
          })),
          [
            { key: 'interestOwing', label: 'Interest owing', color: '#a64d00' },
            { key: 'distributionsPaid', label: 'Distributions paid', color: '#1f6fb2' },
            { key: 'taxDeduction', label: 'Tracked net amount', color: '#0f7f5f' }
          ],
          { valueFormatter: (value) => money.format(value) }
        )}
        <div class="metrics">
          ${metric('Highlighted checkpoint', row?.date ?? '-')}
          ${metric('Interest owing', money.format(row?.interestOwing ?? 0))}
          ${metric('Distributions paid', money.format(row?.distributionsPaid ?? 0))}
          ${metric('Tracked tax deduction', money.format(row?.taxDeduction ?? 0))}
          ${metric('Formula', 'interest - distributions')}
        </div>
        <div class="table-wrap">
          ${table(
            ['Date', 'Interest owing', 'Distributions paid', 'Tracked net amount'],
            rows
              .filter((checkpoint) => checkpoint.distributionsPaid > 0 || checkpoint.interestOwing > 0)
              .map((checkpoint) => [
                checkpoint.date,
                money.format(checkpoint.interestOwing),
                money.format(checkpoint.distributionsPaid),
                money.format(checkpoint.taxDeduction)
              ])
          )}
        </div>
        <p class="note">The dividend events come from the stored XAW.TO fixture. The column is still only a narrow book-keeping field; it is not a tax filing calculation.</p>
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
defineElement('strategy-config-demo', StrategyConfigDemo);
defineElement('synthetic-xaw-demo', SyntheticXawDemo);
defineElement('return-distribution-demo', ReturnDistributionDemo);
defineElement('monthly-step-demo', MonthlyStepDemo);
defineElement('contribution-demo', ContributionDemo);
defineElement('leverage-board-lot-demo', LeverageBoardLotDemo);
defineElement('debt-equity-demo', DebtEquityDemo);
defineElement('interest-policy-demo', InterestPolicyDemo);
defineElement('heloc-cap-demo', HelocCapDemo);
defineElement('tax-deduction-demo', TaxDeductionDemo);
defineElement('drawdown-demo', DrawdownDemo);
defineElement('checkpoint-summary-demo', CheckpointSummaryDemo);
defineElement('outcome-histogram-demo', OutcomeHistogramDemo);
