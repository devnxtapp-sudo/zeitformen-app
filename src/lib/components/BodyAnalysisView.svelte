<script>
  import { state as store } from "../store.svelte.js";
  import { parseYmd } from "../dateutil.js";
  import {
    ALL_METRICS,
    CORE_METRICS,
    metricById,
    fmtMetric,
  } from "../bodyMetrics.js";
  import BodyMeasurementEditor from "./BodyMeasurementEditor.svelte";

  let { onback } = $props();

  // chronological copy (oldest -> newest) for trends; reverse for the list.
  let sorted = $derived(
    [...store.measurements].sort((a, b) => a.date.localeCompare(b.date)),
  );
  let latest = $derived(sorted[sorted.length - 1] ?? null);

  // only offer metrics that actually have at least one recorded value
  let availableMetrics = $derived(
    ALL_METRICS.filter((m) =>
      store.measurements.some(
        (e) => e.metrics?.[m.id] != null && e.metrics[m.id] !== "",
      ),
    ),
  );

  let metric = $state("weight");
  $effect(() => {
    if (availableMetrics.length && !availableMetrics.some((m) => m.id === metric)) {
      metric = availableMetrics[0].id;
    }
  });

  let editorEntry = $state(null);
  let editorOpen = $state(false);
  function openNew() {
    editorEntry = null;
    editorOpen = true;
  }
  function openEdit(e) {
    editorEntry = e;
    editorOpen = true;
  }

  function shortDate(d) {
    return parseYmd(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  }
  function longDate(d) {
    return parseYmd(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // ---- trend chart (same approach as StatsView) ----
  const W = 300;
  const H = 120;
  const PAD = 8;
  let metricMeta = $derived(metricById(metric));
  let series = $derived(
    sorted
      .filter((e) => e.metrics?.[metric] != null && e.metrics[metric] !== "")
      .map((e) => ({ date: e.date, value: Number(e.metrics[metric]) }))
      .filter((p) => !Number.isNaN(p.value)),
  );
  let chart = $derived.by(() => {
    const pts = series;
    if (pts.length === 0) return null;
    const values = pts.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const n = pts.length;
    const x = (i) => (n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1));
    const y = (v) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
    const coords = pts.map((p, i) => ({
      cx: x(i),
      cy: y(p.value),
      value: p.value,
      date: p.date,
    }));
    return {
      coords,
      line: coords.map((c) => `${c.cx},${c.cy}`).join(" "),
      first: values[0],
      last: values[values.length - 1],
    };
  });
  let delta = $derived(
    chart ? Math.round((chart.last - chart.first) * 10) / 10 : 0,
  );
  // direction of "good" for the selected metric drives the delta color
  let deltaGood = $derived(
    metricMeta && metricMeta.goodDir !== 0 && delta !== 0
      ? Math.sign(delta) === metricMeta.goodDir
      : null,
  );
</script>

<div class="body-analysis">
  <div class="head">
    <div class="head-title">
      <button class="back" onclick={() => onback?.()} aria-label="Zurück">‹</button>
      <div>
        <h2>Körperanalyse</h2>
        <span class="sub muted">Deine Körperwerte im Verlauf</span>
      </div>
    </div>
    <div class="head-actions">
      <button class="btn btn-primary btn-sm" onclick={openNew}>+ Messung</button>
    </div>
  </div>

  {#if store.measurements.length === 0}
    <div class="empty-state">
      <p>Noch keine Messungen erfasst.</p>
      <p class="muted">
        Trage deine Werte z.&nbsp;B. von einer InBody-Messung ein, um Gewicht,
        Muskel- und Fettanteil über die Zeit zu verfolgen.
      </p>
      <button class="btn btn-primary" onclick={openNew}>Erste Messung anlegen</button>
    </div>
  {:else}
    {#if latest}
      <section class="panel">
        <div class="panel-head">
          <h3>Letzte Messung</h3>
          <span class="sub muted">{longDate(latest.date)}</span>
        </div>
        <div class="latest-grid">
          {#each CORE_METRICS as m (m.id)}
            <div class="lv">
              <span class="lv-num">{fmtMetric(m, latest.metrics?.[m.id])}</span>
              <span class="lv-lbl">{m.short ?? m.label}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if availableMetrics.length}
      <section class="panel">
        <h3>Verlauf</h3>
        <div class="metric-toggle">
          {#each availableMetrics as m (m.id)}
            <button
              class="mt-btn"
              class:active={metric === m.id}
              onclick={() => (metric = m.id)}
            >
              {m.short ?? m.label}
            </button>
          {/each}
        </div>

        {#if chart}
          <div class="chart-meta">
            <span class="cm-current">{fmtMetric(metricMeta, chart.last)}</span>
            {#if series.length > 1}
              <span
                class="cm-delta"
                class:up={deltaGood === true}
                class:down={deltaGood === false}
              >
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}
                {Math.abs(delta)}{metricMeta.unit ? " " + metricMeta.unit : ""}
              </span>
            {/if}
          </div>
          <svg class="chart" viewBox="0 0 {W} {H}" preserveAspectRatio="none">
            <polyline
              points={chart.line}
              fill="none"
              stroke="var(--c-zone2)"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            {#each chart.coords as c (c.date)}
              <circle cx={c.cx} cy={c.cy} r="3" fill="var(--c-zone2)" />
            {/each}
          </svg>
          <div class="chart-axis">
            <span>{shortDate(series[0].date)}</span>
            <span>{shortDate(series[series.length - 1].date)}</span>
          </div>
        {:else}
          <p class="muted">Für diese Kennzahl sind noch keine Werte erfasst.</p>
        {/if}
      </section>
    {/if}

    <section class="panel">
      <h3>Alle Messungen</h3>
      <div class="list">
        {#each [...sorted].reverse() as e (e.id)}
          <button class="entry" onclick={() => openEdit(e)}>
            <div class="entry-main">
              <span class="entry-date">{longDate(e.date)}</span>
              {#if e.note}<span class="entry-note muted">{e.note}</span>{/if}
            </div>
            <div class="entry-vals">
              {#if e.metrics?.weight != null && e.metrics.weight !== ""}
                <span>{e.metrics.weight} kg</span>
              {/if}
              {#if e.metrics?.bodyFat != null && e.metrics.bodyFat !== ""}
                <span class="dim">· {e.metrics.bodyFat}%</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

{#if editorOpen}
  <BodyMeasurementEditor
    entry={editorEntry}
    onclose={() => (editorOpen = false)}
  />
{/if}

<style>
  .body-analysis {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .head-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .back {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 22px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .back:hover {
    border-color: var(--c-zone2);
  }
  .head h2 {
    font-size: 20px;
  }
  .sub {
    font-size: 12px;
    display: block;
    margin-top: 2px;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }
  .panel h3 {
    font-size: 15px;
    margin-bottom: 14px;
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  .panel-head h3 {
    margin-bottom: 0;
  }
  .latest-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .lv {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lv-num {
    font-size: 19px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.1;
  }
  .lv-lbl {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .metric-toggle {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .mt-btn {
    flex: 0 1 auto;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 600;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
  }
  .mt-btn.active {
    background: rgba(95, 184, 122, 0.12);
    border-color: var(--c-zone2);
    color: var(--c-zone2);
  }
  .chart-meta {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }
  .cm-current {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
  }
  .cm-delta {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .cm-delta.up {
    color: var(--c-zone2, #5fb87a);
  }
  .cm-delta.down {
    color: var(--c-danger, #e5534b);
  }
  .chart {
    width: 100%;
    height: 120px;
    display: block;
    overflow: visible;
  }
  .chart-axis {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--text-dim);
    margin-top: 4px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    color: var(--text);
    transition: border-color 0.15s, background 0.15s;
  }
  .entry:hover {
    border-color: var(--c-zone2);
    background: var(--card-hover);
  }
  .entry-main {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .entry-date {
    font-size: 14px;
    font-weight: 600;
  }
  .entry-note {
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60vw;
  }
  .entry-vals {
    display: flex;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .empty-state {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 22px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }
  .empty-state .btn {
    margin-top: 8px;
  }
  @media (max-width: 480px) {
    .latest-grid {
      gap: 10px 8px;
    }
    .lv-num {
      font-size: 17px;
    }
  }
</style>
