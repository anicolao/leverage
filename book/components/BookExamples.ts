import {
  annualDistributions,
  buildSyntheticXawPriceProxy,
  buildSyntheticXawProxy,
  DEFAULT_XAW_PROXY_WEIGHTS,
  totalReturnIndex,
  type MarketRow
} from '../../src/lib/backtest/marketData';
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
    const symbolData: Record<string, MarketRow[]> = {
      SPY: [
        { date: '2025-01-01', close: 100, dividends: 0 },
        { date: '2025-01-02', close: 104, dividends: 1 }
      ],
      EFA: [
        { date: '2025-01-01', close: 80, dividends: 0 },
        { date: '2025-01-02', close: 82, dividends: 0.4 }
      ],
      EEM: [
        { date: '2025-01-01', close: 50, dividends: 0 },
        { date: '2025-01-02', close: 49, dividends: 0.2 }
      ]
    };
    const fx = [
      { date: '2025-01-01', close: 1.35, dividends: 0 },
      { date: '2025-01-02', close: 1.36, dividends: 0 }
    ];
    const totalReturn = buildSyntheticXawProxy(symbolData, fx, DEFAULT_XAW_PROXY_WEIGHTS, 0);
    const price = buildSyntheticXawPriceProxy(symbolData, fx, DEFAULT_XAW_PROXY_WEIGHTS, 0);

    this.innerHTML = `
      <section class="demo">
        <h3>Two-day synthetic proxy fixture</h3>
        <div class="metrics">
          ${Object.entries(DEFAULT_XAW_PROXY_WEIGHTS)
            .map(([symbol, weight]) => metric(`${symbol} weight`, percent.format(weight)))
            .join('')}
        </div>
        ${table(
          ['Date', 'Price proxy', 'Total return proxy', 'Distribution'],
          price.map((row, index) => [
            row.date,
            number.format(row.close),
            number.format(totalReturn[index].close),
            number.format(row.dividends)
          ])
        )}
        <p class="note">The example calls the same proxy builders as the validation chart and simulator.</p>
      </section>
    `;
  }
}

class ReturnDistributionDemo extends HTMLElement {
  connectedCallback() {
    const rows = [
      { date: '2025-01-01', close: 100, dividends: 0 },
      { date: '2025-01-02', close: 110, dividends: 5 },
      { date: '2026-01-02', close: 99, dividends: 2 }
    ];
    const totalReturn = totalReturnIndex(rows);
    const distributions = annualDistributions(rows);
    this.innerHTML = `
      <section class="demo">
        <h3>Price movement plus distribution cash</h3>
        ${table(
          ['Date', 'Close price', 'Distribution', 'Total return index'],
          rows.map((row, index) => [
            row.date,
            money.format(row.close),
            money.format(row.dividends),
            number.format(totalReturn[index].close)
          ])
        )}
        ${table(
          ['Year', 'Annual distributions'],
          distributions.map((row) => [row.date, money.format(row.close)])
        )}
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
