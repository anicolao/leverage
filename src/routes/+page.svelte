<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const width = 1100;
  const height = 560;
  const padding = { top: 24, right: 28, bottom: 44, left: 64 };
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
  let minValue = $derived(Math.min(...values));
  let maxValue = $derived(Math.max(...values));
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
  const formatX = (value: string, kind: XKind) => (kind === 'year' ? value : value);
  const formatSignedMoney = (value: number) => {
    const formatted = formatMoney(Math.abs(value));
    return value < 0 ? `-${formatted}` : formatted;
  };
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

    <svg viewBox={`0 0 ${width} ${height}`} role="img">
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
        <text x={padding.left - 12} y={y(value) + 5} text-anchor="end">{formatValue(value, chart.valueKind)}</text>
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

  svg {
    display: block;
    width: 100%;
    min-height: 320px;
    background: #fffdfa;
    border: 1px solid #d9ddd2;
    border-radius: 8px;
  }

  .axis {
    stroke: #2f3a33;
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

    .table-header {
      align-items: stretch;
      flex-direction: column;
      gap: 4px;
    }
  }
</style>
