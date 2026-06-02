<script lang="ts">
  import {
    simulateDcaPortfolio,
    summarizeSimulationRows,
    type CapitalizationPolicy,
    type DcaSimulationRow,
    type SimulationInterval
  } from '$lib/backtest/dcaSimulator';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const width = 1100;
  const height = 560;
  const padding = { top: 24, right: 78, bottom: 44, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const chartOptions = {
    totalReturn: {
      label: 'Total Return',
      title: 'Total return',
      description:
        'Growth of $100. Proxy weights: 55% SPY, 35% EFA, 10% EEM, converted to CAD with CAD=X, less 0.22% annual MER and calibrated distribution-tax drag.',
      actualLabel: 'Real XAW.TO total return',
      syntheticLabel: 'Synthetic total return',
      valueKind: 'money',
      xKind: 'date'
    },
    price: {
      label: 'Price Action',
      title: 'Raw price action',
      description: 'Daily close price with distributions excluded. The synthetic proxy is scaled to XAW.TO at the first overlapping close.',
      actualLabel: 'Raw XAW.TO close',
      syntheticLabel: 'Synthetic price proxy',
      valueKind: 'money',
      xKind: 'date'
    },
    distributions: {
      label: 'Dividends',
      title: 'Annual distributions',
      description: 'Annual cash distributions per XAW.TO share, with the synthetic proxy scaled into XAW.TO share-price space.',
      actualLabel: 'Raw XAW.TO distributions',
      syntheticLabel: 'Synthetic distributions',
      valueKind: 'money',
      xKind: 'year'
    }
  } as const;
  type ChartKey = keyof typeof chartOptions;
  type ValueKind = (typeof chartOptions)[ChartKey]['valueKind'];
  type XKind = (typeof chartOptions)[ChartKey]['xKind'];
  type SeriesPoint = {
    date: string;
    actual: number;
    synthetic: number;
  };

  let activeChart = $state<ChartKey>('totalReturn');
  let chart = $derived(chartOptions[activeChart]);
  let activeSeries = $derived(data.series[activeChart]);
  let actualByDate = $derived(new Map(activeSeries.actual.map((row) => [row.date, row.close])));
  let points = $derived(activeSeries.synthetic
    .map((row) => ({
      date: row.date,
      synthetic: row.close,
      actual: actualByDate.get(row.date)
    }))
    .filter(
      (row): row is { date: string; synthetic: number; actual: number } => row.actual !== undefined
    ));

  let values = $derived(points.flatMap((row) => [row.synthetic, row.actual]));
  let minValue = $derived(activeChart === 'distributions' ? Math.min(0, ...values) : Math.min(...values));
  let maxValue = $derived(activeChart === 'distributions' ? Math.max(0, ...values) : Math.max(...values));
  let minTime = $derived(Date.parse(`${points[0].date}T00:00:00Z`));
  let maxTime = $derived(Date.parse(`${points[points.length - 1].date}T00:00:00Z`));

  const x = (date: string) =>
    padding.left +
    ((Date.parse(`${date}T00:00:00Z`) - minTime) / (maxTime - minTime || 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + (1 - (value - minValue) / (maxValue - minValue || 1)) * plotHeight;
  const line = (key: 'synthetic' | 'actual') =>
    points.map((row) => `${x(row.date)},${y(row[key])}`).join(' ');
  const bars = (key: 'synthetic' | 'actual') =>
    points.map((row, index) => {
      const groupWidth = plotWidth / Math.max(points.length, 1);
      const barWidth = Math.min(28, groupWidth * 0.34);
      const center = padding.left + groupWidth * (index + 0.5);
      const left = center + (key === 'actual' ? -barWidth : 0);
      const top = y(row[key]);
      const baseline = y(0);
      return {
        date: row.date,
        x: left,
        y: Math.min(top, baseline),
        width: barWidth,
        height: Math.abs(baseline - top)
      };
    });
  let hoveredPoint = $state<SeriesPoint | null>(null);
  let hoveredPointX = $derived(hoveredPoint ? x(hoveredPoint.date) : 0);
  let hoveredPointCalloutX = $derived(Math.min(width - 260, Math.max(76, hoveredPointX + 12)));

  function handleSeriesPointer(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    hoveredPoint = nearestPoint(points, pointerSvgX(event, svg), x);
  }

  let firstDate = $derived(points[0]?.date ?? data.start);
  let lastDate = $derived(points[points.length - 1]?.date ?? data.start);
  let tableRows = $derived(
    [...points].reverse().map((row) => {
      const difference = row.synthetic - row.actual;
      return {
        ...row,
        difference,
        percentDifference: row.actual === 0 ? Number.NaN : difference / row.actual
      };
    })
  );
  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 2
    }).format(value);
  const formatPercent = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'percent',
      maximumFractionDigits: 2
    }).format(value);
  const formatPercentOrNa = (value: number) =>
    Number.isFinite(value) ? formatPercent(value) : 'n/a';
  const formatValue = (value: number, kind: ValueKind) =>
    kind === 'money' ? formatMoney(value) : value.toLocaleString('en-CA');
  const formatAxisMoney = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  const formatAxisValue = (value: number, kind: ValueKind) =>
    kind === 'money' ? formatAxisMoney(value) : value.toLocaleString('en-CA');
  const formatX = (value: string, kind: XKind) => (kind === 'year' ? value : value);
  const formatSignedMoney = (value: number) => {
    const formatted = formatMoney(Math.abs(value));
    return value < 0 ? `-${formatted}` : formatted;
  };
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      maximumFractionDigits: 2
    }).format(value);

  let simulationStartDate = $state(initialSimulationStartDate());
  let investmentTarget = $state(500_000);
  let maxHelocDebt = $state(1_000_000);
  let monthlyContribution = $state(100_000);
  let leverageTargetPercent = $state(20);
  let capitalizationPolicy = $state<CapitalizationPolicy>('always');
  let simulationInterval = $state<SimulationInterval>('monthly');
  let simulationRows = $derived(
    simulateDcaPortfolio(data.simulationSeries, {
      startDate: simulationStartDate,
      investmentTarget,
      monthlyContribution,
      leverageTarget: Math.min(0.95, Math.max(0, leverageTargetPercent / 100)),
      maxHelocDebt,
      primeRates: data.primeRates,
      capitalizationPolicy
    })
  );
  let summarizedSimulationRows = $derived(summarizeSimulationRows(simulationRows, simulationInterval));
  let simulationTableRows = $derived([...summarizedSimulationRows].reverse());
  let finalSimulationRow = $derived(simulationRows.at(-1));
  let totalInterest = $derived(
    simulationRows.reduce((total, row) => total + row.interestOwing, 0)
  );
  let totalMarginInterest = $derived(
    simulationRows.reduce((total, row) => total + row.marginInterestOwing, 0)
  );
  let totalHelocInterest = $derived(
    simulationRows.reduce((total, row) => total + row.helocInterestOwing, 0)
  );
  let totalHelocInterestPaidByDistributions = $derived(
    simulationRows.reduce((total, row) => total + row.helocInterestPaidByDistributions, 0)
  );
  let totalHelocInterestPaidBySale = $derived(
    simulationRows.reduce((total, row) => total + row.helocInterestPaidBySale, 0)
  );
  let totalDistributions = $derived(
    simulationRows.reduce((total, row) => total + row.distributionsPaid, 0)
  );
  let totalTaxDeduction = $derived(
    simulationRows.reduce((total, row) => total + row.taxDeduction, 0)
  );
  let latestPrimeRate = $derived(data.primeRates.at(-1)?.annualRate ?? 0);
  let simulationValues = $derived(
    simulationRows.flatMap((row) => [row.totalAssets, row.equity, row.totalDebt])
  );
  let simulationPriceValues = $derived(simulationRows.map((row) => row.price));
  let simulationMinTime = $derived(
    Date.parse(`${simulationRows[0]?.date ?? simulationStartDate}T00:00:00Z`)
  );
  let simulationMaxTime = $derived(
    Date.parse(`${simulationRows.at(-1)?.date ?? simulationStartDate}T00:00:00Z`)
  );
  let simulationMinValue = $derived(Math.min(0, ...simulationValues));
  let simulationMaxValue = $derived(Math.max(1, ...simulationValues));
  let simulationMinPrice = $derived(Math.min(...simulationPriceValues));
  let simulationMaxPrice = $derived(Math.max(...simulationPriceValues));
  const simulationX = (date: string) =>
    padding.left +
    ((Date.parse(`${date}T00:00:00Z`) - simulationMinTime) /
      (simulationMaxTime - simulationMinTime || 1)) *
      plotWidth;
  const simulationY = (value: number) =>
    padding.top +
    (1 - (value - simulationMinValue) / (simulationMaxValue - simulationMinValue || 1)) *
      plotHeight;
  const simulationPriceY = (value: number) =>
    padding.top +
    (1 - (value - simulationMinPrice) / (simulationMaxPrice - simulationMinPrice || 1)) *
      plotHeight;
  const simulationLine = (key: keyof Pick<DcaSimulationRow, 'totalAssets' | 'equity' | 'totalDebt'>) =>
    simulationRows.map((row) => `${simulationX(row.date)},${simulationY(row[key])}`).join(' ');
  const simulationPriceLine = () =>
    simulationRows.map((row) => `${simulationX(row.date)},${simulationPriceY(row.price)}`).join(' ');
  let hoveredSimulationRow = $state<DcaSimulationRow | null>(null);
  let hoveredSimulationX = $derived(
    hoveredSimulationRow ? simulationX(hoveredSimulationRow.date) : 0
  );
  let hoveredSimulationCalloutX = $derived(
    Math.min(width - 280, Math.max(76, hoveredSimulationX + 12))
  );

  function handleSimulationPointer(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    hoveredSimulationRow = nearestPoint(simulationRows, pointerSvgX(event, svg), simulationX);
  }

  function initialSimulationStartDate() {
    return data.simulationSeries[0]?.date ?? data.start;
  }

  function pointerSvgX(event: PointerEvent, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * width;
  }

  function nearestPoint<T extends { date: string }>(
    rows: T[],
    pointerX: number,
    projectX: (date: string) => number
  ): T | null {
    if (rows.length === 0) {
      return null;
    }
    return rows.reduce((nearest, row) =>
      Math.abs(projectX(row.date) - pointerX) < Math.abs(projectX(nearest.date) - pointerX)
        ? row
        : nearest
    );
  }
</script>

<svelte:head>
  <title>Synthetic XAW.TO Total Return Replication</title>
</svelte:head>

<main>
  <section class="summary">
    <div>
      <p class="eyebrow">XAW.TO proxy validation</p>
      <h1>Synthetic global equity total return versus real XAW.TO</h1>
    </div>
    <div class="stats">
      <div>
        <span>Overlap</span>
        <strong>{data.stats.overlapDays.toLocaleString('en-CA')} days</strong>
      </div>
      <div>
        <span>Correlation</span>
        <strong>{data.stats.correlation.toFixed(4)}</strong>
      </div>
      <div>
        <span>Mean Abs. Error</span>
        <strong>{formatPercent(data.stats.meanAbsolutePercentError)}</strong>
      </div>
      <div>
        <span>Distribution Drag</span>
        <strong>{formatPercent(data.calibration.distributionTaxDrag)}</strong>
      </div>
    </div>
  </section>

  <section class="chart-shell" aria-label="Synthetic XAW.TO versus actual XAW.TO comparison charts">
    <div class="tabs" role="tablist" aria-label="Chart type">
      {#each Object.entries(chartOptions) as [key, option]}
        <button
          type="button"
          class:active={activeChart === key}
          aria-selected={activeChart === key}
          role="tab"
          onclick={() => {
            activeChart = key as ChartKey;
          }}
        >
          {option.label}
        </button>
      {/each}
    </div>
    <div class="chart-header">
      <div>
        <h2>{chart.title}: {formatX(firstDate, chart.xKind)} to {formatX(lastDate, chart.xKind)}</h2>
        <p>{chart.description}</p>
      </div>
      <div class="legend">
        <span><i class="actual"></i> {chart.actualLabel}</span>
        <span><i class="synthetic"></i> {chart.syntheticLabel}</span>
      </div>
    </div>
    <div class="source-links" aria-label="Yahoo Finance source links">
      <a href={data.yahooLinks.chart} target="_blank" rel="noreferrer">Yahoo XAW chart</a>
      <a href={data.yahooLinks.prices} target="_blank" rel="noreferrer">Yahoo XAW price table</a>
      <a href={data.yahooLinks.dividends} target="_blank" rel="noreferrer">Yahoo XAW dividend table</a>
    </div>

    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      onpointermove={handleSeriesPointer}
      onpointerleave={() => {
        hoveredPoint = null;
      }}
    >
      <title>{chart.title} comparison for synthetic XAW.TO and actual XAW.TO</title>
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        class="axis"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        class="axis"
      />
      {#each [0, 0.25, 0.5, 0.75, 1] as tick}
        {@const value = minValue + (maxValue - minValue) * tick}
        <line
          x1={padding.left}
          y1={y(value)}
          x2={width - padding.right}
          y2={y(value)}
          class="grid"
        />
        <text x={padding.left - 12} y={y(value) + 5} text-anchor="end">{formatAxisValue(value, chart.valueKind)}</text>
      {/each}
      {#if activeChart === 'distributions'}
        {#each bars('actual') as bar}
          <rect class="actual-bar" x={bar.x} y={bar.y} width={bar.width} height={bar.height} />
        {/each}
        {#each bars('synthetic') as bar}
          <rect class="synthetic-bar" x={bar.x} y={bar.y} width={bar.width} height={bar.height} />
        {/each}
      {:else}
        <polyline points={line('actual')} class="actual-line" />
        <polyline points={line('synthetic')} class="synthetic-line" />
      {/if}
      {#if hoveredPoint}
        <line
          x1={hoveredPointX}
          y1={padding.top}
          x2={hoveredPointX}
          y2={height - padding.bottom}
          class="hover-line"
        />
        <g class="tooltip">
          <rect x={hoveredPointCalloutX} y={padding.top + 10} width="236" height="86" rx="6" />
          <text x={hoveredPointCalloutX + 12} y={padding.top + 32}>{formatX(hoveredPoint.date, chart.xKind)}</text>
          <text x={hoveredPointCalloutX + 12} y={padding.top + 54}>{chart.actualLabel}: {formatValue(hoveredPoint.actual, chart.valueKind)}</text>
          <text x={hoveredPointCalloutX + 12} y={padding.top + 76}>{chart.syntheticLabel}: {formatValue(hoveredPoint.synthetic, chart.valueKind)}</text>
        </g>
      {/if}
      <text x={padding.left} y={height - 12}>{formatX(firstDate, chart.xKind)}</text>
      <text x={width - padding.right} y={height - 12} text-anchor="end">{formatX(lastDate, chart.xKind)}</text>
    </svg>

    <div class="data-table">
      <div class="table-header">
        <h3>{chart.title} data points</h3>
        <span>{tableRows.length.toLocaleString('en-CA')} rows, newest first</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{chart.xKind === 'year' ? 'Year' : 'Date'}</th>
              <th>{chart.actualLabel}</th>
              <th>{chart.syntheticLabel}</th>
              <th>Difference</th>
              <th>Difference %</th>
            </tr>
          </thead>
          <tbody>
            {#each tableRows as row}
              <tr>
                <td>{formatX(row.date, chart.xKind)}</td>
                <td>{formatValue(row.actual, chart.valueKind)}</td>
                <td>{formatValue(row.synthetic, chart.valueKind)}</td>
                <td class:negative={row.difference < 0}>{formatSignedMoney(row.difference)}</td>
                <td class:negative={row.percentDifference < 0}>{formatPercentOrNa(row.percentDifference)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="simulator-shell" aria-label="Monthly leveraged DCA simulator">
    <div class="simulator-header">
      <div>
        <p class="eyebrow">Portfolio simulator</p>
        <h2>Monthly leveraged DCA into the synthetic proxy</h2>
        <p>
          Leverage is margin debt divided by brokerage assets. HELOC debt funds monthly
          contributions and capitalized interest, but sits outside the margin leverage target.
          Contributions and rebalancing happen monthly; the table interval only changes how
          checkpoint rows are summarized.
          Borrowing interest uses the historical Canadian prime rate from the Bank of Canada,
          fill-forwarded from weekly observations. Distributions are applied to HELOC interest
          first; any remaining HELOC interest is paid by selling shares.
        </p>
      </div>
    </div>

    <div class="control-grid">
      <label>
        <span>Start date</span>
        <input
          type="date"
          min={data.simulationSeries[0]?.date}
          max={data.simulationSeries.at(-1)?.date}
          bind:value={simulationStartDate}
        />
      </label>
      <label>
        <span>Investment target</span>
        <input type="number" min="0" step="1000" bind:value={investmentTarget} />
      </label>
      <label>
        <span>Max HELOC debt</span>
        <input type="number" min="0" step="1000" bind:value={maxHelocDebt} />
      </label>
      <label>
        <span>Monthly investment</span>
        <input type="number" min="0" step="1000" bind:value={monthlyContribution} />
      </label>
      <label>
        <span>Table interval</span>
        <select bind:value={simulationInterval}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </label>
      <label>
        <span>Leverage target</span>
        <input type="number" min="0" max="95" step="1" bind:value={leverageTargetPercent} />
      </label>
      <label>
        <span>Capitalize interest</span>
        <select bind:value={capitalizationPolicy}>
          <option value="movingAverage">120-day moving average</option>
          <option value="negativeEquity">When equity is negative</option>
          <option value="never">Never</option>
          <option value="always">Always</option>
        </select>
      </label>
    </div>

    <div class="sim-stats">
      <div>
        <span>Final Assets</span>
        <strong>{formatMoney(finalSimulationRow?.totalAssets ?? 0)}</strong>
      </div>
      <div>
        <span>Cash Balance</span>
        <strong>{formatMoney(finalSimulationRow?.cashBalance ?? 0)}</strong>
      </div>
      <div>
        <span>Total Debt</span>
        <strong>{formatMoney(finalSimulationRow?.totalDebt ?? 0)}</strong>
      </div>
      <div>
        <span>Equity</span>
        <strong>{formatMoney(finalSimulationRow?.equity ?? 0)}</strong>
      </div>
      <div>
        <span>Margin Leverage</span>
        <strong>{formatPercent(finalSimulationRow?.leverage ?? 0)}</strong>
      </div>
      <div>
        <span>HELOC Capacity</span>
        <strong>{formatMoney(finalSimulationRow?.remainingHelocCapacity ?? 0)}</strong>
      </div>
      <div>
        <span>Margin Call Drawdown</span>
        <strong>{formatPercentOrNa(finalSimulationRow?.marginCallDrawdown ?? Number.NaN)}</strong>
      </div>
      <div>
        <span>Collapse Drawdown</span>
        <strong>{formatPercentOrNa(finalSimulationRow?.collapseDrawdown ?? Number.NaN)}</strong>
      </div>
      <div>
        <span>Total Interest</span>
        <strong>{formatMoney(totalInterest)}</strong>
      </div>
      <div>
        <span>Margin Interest</span>
        <strong>{formatMoney(totalMarginInterest)}</strong>
      </div>
      <div>
        <span>HELOC Interest</span>
        <strong>{formatMoney(totalHelocInterest)}</strong>
      </div>
      <div>
        <span>HELOC Int. from Distributions</span>
        <strong>{formatMoney(totalHelocInterestPaidByDistributions)}</strong>
      </div>
      <div>
        <span>HELOC Int. Sold</span>
        <strong>{formatMoney(totalHelocInterestPaidBySale)}</strong>
      </div>
      <div>
        <span>Distributions</span>
        <strong>{formatMoney(totalDistributions)}</strong>
      </div>
      <div>
        <span>Tax Deduction</span>
        <strong>{formatSignedMoney(totalTaxDeduction)}</strong>
      </div>
      <div>
        <span>Latest Prime</span>
        <strong>{formatPercent(latestPrimeRate)}</strong>
      </div>
    </div>

    <div class="chart-header">
      <div>
        <h2>Portfolio path</h2>
        <p>Monthly checkpoints after interest handling, HELOC draw, contribution, and margin rebalance.</p>
      </div>
      <div class="legend">
        <span><i class="assets"></i> Assets</span>
        <span><i class="equity"></i> Equity</span>
        <span><i class="debt"></i> Debt</span>
        <span><i class="price"></i> Proxy price</span>
      </div>
    </div>

    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      onpointermove={handleSimulationPointer}
      onpointerleave={() => {
        hoveredSimulationRow = null;
      }}
    >
      <title>Monthly leveraged DCA portfolio path</title>
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        class="axis"
      />
      <line
        x1={padding.left}
        y1={simulationY(0)}
        x2={width - padding.right}
        y2={simulationY(0)}
        class="axis"
      />
      {#each [0, 0.25, 0.5, 0.75, 1] as tick}
        {@const value = simulationMinValue + (simulationMaxValue - simulationMinValue) * tick}
        <line
          x1={padding.left}
          y1={simulationY(value)}
          x2={width - padding.right}
          y2={simulationY(value)}
          class="grid"
        />
        <text x={padding.left - 12} y={simulationY(value) + 5} text-anchor="end">{formatAxisMoney(value)}</text>
      {/each}
      <line
        x1={width - padding.right}
        y1={padding.top}
        x2={width - padding.right}
        y2={height - padding.bottom}
        class="price-axis"
      />
      {#each [0, 0.25, 0.5, 0.75, 1] as tick}
        {@const value = simulationMinPrice + (simulationMaxPrice - simulationMinPrice) * tick}
        <text x={width - padding.right + 10} y={simulationPriceY(value) + 5}>{formatMoney(value)}</text>
      {/each}
      <polyline points={simulationLine('totalAssets')} class="assets-line" />
      <polyline points={simulationLine('equity')} class="equity-line" />
      <polyline points={simulationLine('totalDebt')} class="debt-line" />
      <polyline points={simulationPriceLine()} class="price-line" />
      {#if hoveredSimulationRow}
        <line
          x1={hoveredSimulationX}
          y1={padding.top}
          x2={hoveredSimulationX}
          y2={height - padding.bottom}
          class="hover-line"
        />
        <g class="tooltip">
          <rect x={hoveredSimulationCalloutX} y={padding.top + 10} width="256" height="152" rx="6" />
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 32}>{hoveredSimulationRow.date}</text>
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 54}>Assets: {formatMoney(hoveredSimulationRow.totalAssets)}</text>
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 76}>Total debt: {formatMoney(hoveredSimulationRow.totalDebt)}</text>
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 98}>Equity: {formatMoney(hoveredSimulationRow.equity)}</text>
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 120}>Cash: {formatMoney(hoveredSimulationRow.cashBalance)}</text>
          <text x={hoveredSimulationCalloutX + 12} y={padding.top + 142}>Proxy price: {formatMoney(hoveredSimulationRow.price)}</text>
        </g>
      {/if}
      <text x={padding.left} y={height - 12}>{simulationRows[0]?.date ?? simulationStartDate}</text>
      <text x={width - padding.right} y={height - 12} text-anchor="end">{simulationRows.at(-1)?.date ?? simulationStartDate}</text>
    </svg>

    <div class="data-table">
      <div class="table-header">
        <h3>Simulation checkpoints</h3>
        <span>{simulationTableRows.length.toLocaleString('en-CA')} rows, newest first</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Price</th>
              <th>Contribution</th>
              <th>Trade</th>
              <th>Shares</th>
              <th>Share Value</th>
              <th>Cash Balance</th>
              <th>Total Assets</th>
              <th>Margin Debt</th>
              <th>HELOC Debt</th>
              <th>HELOC Capacity</th>
              <th>Total Debt</th>
              <th>Equity</th>
              <th>Margin Leverage</th>
              <th>Margin Call Drawdown</th>
              <th>Collapse Drawdown</th>
              <th>Prime Rate</th>
              <th>Margin Interest</th>
              <th>HELOC Interest</th>
              <th>Margin Int. Sold</th>
              <th>HELOC Int. from Dist.</th>
              <th>HELOC Int. Sold</th>
              <th>HELOC Over-Limit Sold</th>
              <th>Margin Int. to HELOC</th>
              <th>Distributions</th>
              <th>Tax Deduction</th>
            </tr>
          </thead>
          <tbody>
            {#each simulationTableRows as row}
              <tr>
                <td>{row.date}</td>
                <td>{formatMoney(row.price)}</td>
                <td>{formatMoney(row.contribution)}</td>
                <td class:negative={row.tradeAmount < 0}>{formatSignedMoney(row.tradeAmount)}</td>
                <td>{formatNumber(row.shares)}</td>
                <td>{formatMoney(row.shareValue)}</td>
                <td>{formatMoney(row.cashBalance)}</td>
                <td>{formatMoney(row.totalAssets)}</td>
                <td>{formatMoney(row.marginDebt)}</td>
                <td>{formatMoney(row.helocDebt)}</td>
                <td>{formatMoney(row.remainingHelocCapacity)}</td>
                <td>{formatMoney(row.totalDebt)}</td>
                <td>{formatMoney(row.equity)}</td>
                <td>{formatPercent(row.leverage)}</td>
                <td>{formatPercentOrNa(row.marginCallDrawdown)}</td>
                <td>{formatPercentOrNa(row.collapseDrawdown)}</td>
                <td>{formatPercent(row.primeRate)}</td>
                <td>{formatMoney(row.marginInterestOwing)}</td>
                <td>{formatMoney(row.helocInterestOwing)}</td>
                <td>{formatMoney(row.interestPaidBySale)}</td>
                <td>{formatMoney(row.helocInterestPaidByDistributions)}</td>
                <td>{formatMoney(row.helocInterestPaidBySale)}</td>
                <td>{formatMoney(row.helocLimitPaidBySale)}</td>
                <td>{formatMoney(row.interestCapitalized)}</td>
                <td>{formatMoney(row.distributionsPaid)}</td>
                <td class:negative={row.taxDeduction < 0}>{formatSignedMoney(row.taxDeduction)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f7f7f2;
    color: #18201b;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  main {
    min-height: 100vh;
  }

  .summary {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 32px;
    padding: 40px clamp(20px, 5vw, 72px) 24px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #486756;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    max-width: 780px;
    font-size: clamp(2rem, 4vw, 4.25rem);
    line-height: 1;
    letter-spacing: 0;
  }

  h2 {
    font-size: 1.15rem;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    gap: 12px;
    min-width: min(520px, 100%);
  }

  .stats div {
    border-left: 3px solid #668a73;
    padding: 8px 12px;
  }

  .stats span,
  .chart-header p,
  svg text {
    color: #5a635d;
    font-size: 0.85rem;
  }

  .stats strong {
    display: block;
    margin-top: 6px;
    font-size: 1.25rem;
  }

  .chart-shell {
    padding: 16px clamp(20px, 5vw, 72px) 48px;
  }

  .simulator-shell {
    padding: 10px clamp(20px, 5vw, 72px) 56px;
  }

  .simulator-header {
    max-width: 980px;
    margin-bottom: 18px;
  }

  .simulator-header p:last-child {
    margin-top: 8px;
    color: #5a635d;
    line-height: 1.5;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .control-grid label {
    display: grid;
    gap: 6px;
  }

  .control-grid span {
    color: #46544b;
    font-size: 0.82rem;
    font-weight: 800;
  }

  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #c9d2c6;
    border-radius: 6px;
    background: #fffdfa;
    color: #18201b;
    font: inherit;
    padding: 9px 10px;
  }

  .sim-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
    gap: 12px;
    margin: 0 0 18px;
  }

  .sim-stats div {
    border-top: 3px solid #7b8d85;
    padding: 10px 0 0;
  }

  .sim-stats span {
    display: block;
    color: #5a635d;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .sim-stats strong {
    display: block;
    margin-top: 6px;
    font-size: 1.2rem;
  }

  .tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 18px;
    border: 1px solid #cfd8cc;
    border-radius: 8px;
    background: #eef3ec;
    padding: 4px;
  }

  .tabs button {
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #334139;
    cursor: pointer;
    font: inherit;
    font-size: 0.92rem;
    font-weight: 700;
    padding: 8px 12px;
  }

  .tabs button.active {
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(24, 32, 27, 0.14);
  }

  .chart-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 14px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.9rem;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .legend i {
    display: inline-block;
    width: 24px;
    height: 4px;
    border-radius: 999px;
  }

  .source-links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 14px;
  }

  .source-links a {
    border: 1px solid #cfd8cc;
    border-radius: 6px;
    background: #ffffff;
    color: #1c4c73;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 7px 10px;
    text-decoration: none;
  }

  .source-links a:hover {
    border-color: #164b7a;
  }

  .legend .actual {
    background: #164b7a;
  }

  .legend .synthetic {
    background: #b55b2c;
  }

  .legend .assets {
    background: #164b7a;
  }

  .legend .equity {
    background: #2f7d4f;
  }

  .legend .debt {
    background: #8f351e;
  }

  .legend .price {
    background: #6a4c9c;
  }

  svg {
    display: block;
    width: 100%;
    min-height: 320px;
    background: #fffdfa;
    border: 1px solid #d9ddd2;
    border-radius: 8px;
    touch-action: none;
  }

  .axis {
    stroke: #2f3a33;
    stroke-width: 1.5;
  }

  .price-axis {
    stroke: #6a4c9c;
    stroke-width: 1.5;
  }

  .grid {
    stroke: #dfe4dc;
    stroke-width: 1;
  }

  .actual-line,
  .synthetic-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;
  }

  .actual-line {
    stroke: #164b7a;
  }

  .synthetic-line {
    stroke: #b55b2c;
    stroke-dasharray: 8 7;
  }

  .assets-line,
  .equity-line,
  .debt-line,
  .price-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;
  }

  .assets-line {
    stroke: #164b7a;
  }

  .equity-line {
    stroke: #2f7d4f;
  }

  .debt-line {
    stroke: #8f351e;
  }

  .price-line {
    stroke: #6a4c9c;
    stroke-dasharray: 3 6;
  }

  .actual-bar,
  .synthetic-bar {
    rx: 2px;
  }

  .actual-bar {
    fill: #164b7a;
  }

  .synthetic-bar {
    fill: #b55b2c;
    opacity: 0.82;
  }

  .hover-line {
    stroke: #2f3a33;
    stroke-dasharray: 4 5;
    stroke-width: 1.5;
    pointer-events: none;
  }

  .tooltip {
    pointer-events: none;
  }

  .tooltip rect {
    fill: #18201b;
    opacity: 0.92;
  }

  .tooltip text {
    fill: #ffffff;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .data-table {
    margin-top: 18px;
    border: 1px solid #d9ddd2;
    border-radius: 8px;
    background: #fffdfa;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: 1px solid #e2e5dd;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
  }

  .table-header span {
    color: #5a635d;
    font-size: 0.85rem;
  }

  .table-scroll {
    max-height: 420px;
    overflow: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  th,
  td {
    border-bottom: 1px solid #ecefe8;
    padding: 9px 12px;
    text-align: right;
    white-space: nowrap;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    background: #fffdfa;
    text-align: left;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f3f5ee;
    color: #3f4b43;
    font-weight: 800;
  }

  th:first-child {
    z-index: 2;
    background: #f3f5ee;
  }

  td.negative {
    color: #8f351e;
  }

  @media (max-width: 820px) {
    .summary,
    .chart-header {
      align-items: stretch;
      flex-direction: column;
    }

    .stats {
      grid-template-columns: 1fr;
      min-width: 0;
    }

    .control-grid,
    .sim-stats {
      grid-template-columns: 1fr;
    }

    .table-header {
      align-items: stretch;
      flex-direction: column;
      gap: 4px;
    }
  }
</style>
