import { marginRateFromPrime } from '../../src/lib/backtest/dcaSimulator';
import { simpleInterestForDays } from '../examples/interest-fixture';
import './interest-accrual-demo.css';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 2
});

const percent = new Intl.NumberFormat('en-CA', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

class InterestAccrualDemo extends HTMLElement {
  private debtInput?: HTMLInputElement;
  private primeInput?: HTMLInputElement;
  private daysInput?: HTMLInputElement;
  private marginRateOutput?: HTMLElement;
  private marginInterestOutput?: HTMLElement;
  private helocInterestOutput?: HTMLElement;

  connectedCallback(): void {
    this.innerHTML = `
      <section class="interest-demo">
        <div class="controls">
          <label>
            Debt
            <input data-field="debt" type="number" min="0" step="1000" value="25000" />
          </label>
          <label>
            Prime rate
            <input data-field="prime" type="number" min="0" max="25" step="0.05" value="4.45" />
          </label>
          <label>
            Elapsed days
            <input data-field="days" type="number" min="0" step="1" value="32" />
          </label>
        </div>
        <div class="results" aria-live="polite">
          <div class="metric">
            <span>Margin rate</span>
            <strong data-output="margin-rate"></strong>
          </div>
          <div class="metric">
            <span>Margin interest</span>
            <strong data-output="margin-interest"></strong>
          </div>
          <div class="metric">
            <span>HELOC interest</span>
            <strong data-output="heloc-interest"></strong>
          </div>
        </div>
      </section>
    `;

    this.debtInput = this.querySelector('[data-field="debt"]') ?? undefined;
    this.primeInput = this.querySelector('[data-field="prime"]') ?? undefined;
    this.daysInput = this.querySelector('[data-field="days"]') ?? undefined;
    this.marginRateOutput = this.querySelector('[data-output="margin-rate"]') ?? undefined;
    this.marginInterestOutput =
      this.querySelector('[data-output="margin-interest"]') ?? undefined;
    this.helocInterestOutput =
      this.querySelector('[data-output="heloc-interest"]') ?? undefined;

    this.addEventListener('input', () => this.update());
    this.update();
  }

  private update(): void {
    const debt = Number(this.debtInput?.value ?? 0);
    const primeRate = Number(this.primeInput?.value ?? 0) / 100;
    const elapsedDays = Number(this.daysInput?.value ?? 0);
    const marginRate = marginRateFromPrime(primeRate);

    if (this.marginRateOutput) {
      this.marginRateOutput.textContent = percent.format(marginRate);
    }
    if (this.marginInterestOutput) {
      this.marginInterestOutput.textContent = currency.format(
        simpleInterestForDays(debt, marginRate, elapsedDays)
      );
    }
    if (this.helocInterestOutput) {
      this.helocInterestOutput.textContent = currency.format(
        simpleInterestForDays(debt, primeRate, elapsedDays)
      );
    }
  }
}

customElements.define('interest-accrual-demo', InterestAccrualDemo);
