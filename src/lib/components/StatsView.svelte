<script>
  import {
    computeStats,
    exerciseNames,
    exerciseProgress,
    PROGRESS_METRICS,
  } from "../stats.js";
  import { parseYmd } from "../dateutil.js";

  let { goal } = $props();

  let stats = $derived(computeStats(goal));
  let maxWeek = $derived(Math.max(1, ...stats.weekly.map((w) => w.count)));

  function weekLabel(monday) {
    const d = parseYmd(monday);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  // ---- per-exercise progression ----
  let exercises = $derived(exerciseNames(goal));
  let selectedExercise = $state(null);
  let metric = $state("topWeight");

  // default the selection to the first available exercise
  $effect(() => {
    if (exercises.length && !exercises.includes(selectedExercise)) {
      selectedExercise = exercises[0];
    } else if (!exercises.length) {
      selectedExercise = null;
    }
  });

  let progress = $derived(
    selectedExercise ? exerciseProgress(goal, selectedExercise, metric) : [],
  );
  let metricMeta = $derived(PROGRESS_METRICS.find((m) => m.id === metric));

  // build an SVG polyline over the data points
  const W = 300;
  const H = 120;
  const PAD = 8;
  let chart = $derived.by(() => {
    const pts = progress;
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
    const line = coords.map((c) => `${c.cx},${c.cy}`).join(" ");
    return { coords, line, min, max, first: values[0], last: values[values.length - 1] };
  });

  function shortDate(d) {
    return parseYmd(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  let delta = $derived(
    chart ? Math.round((chart.last - chart.first) * 10) / 10 : 0,
  );
</script>

<div class="stats">
  <div class="cards">
    <div class="stat-card">
      <span class="s-num">{stats.total}</span>
      <span class="s-lbl">Einheiten insgesamt</span>
    </div>
    <div class="stat-card">
      <span class="s-num">{stats.streak}</span>
      <span class="s-lbl">Wochen-Streak</span>
    </div>
    <div class="stat-card">
      <span class="s-num">{stats.last30}</span>
      <span class="s-lbl">letzte 30 Tage</span>
    </div>
  </div>

  <section class="panel">
    <h3>Wochen-Trend</h3>
    <span class="sub muted">letzte 8 Wochen</span>
    <div class="trend">
      {#each stats.weekly as w (w.monday)}
        <div class="bar-col">
          <div class="bar-wrap">
            {#if w.count > 0}
              <span class="bar-val">{w.count}</span>
            {/if}
            <div
              class="bar"
              style="height: {(w.count / maxWeek) * 100}%"
              class:empty={w.count === 0}
            ></div>
          </div>
          <span class="bar-lbl">{weekLabel(w.monday)}</span>
        </div>
      {/each}
    </div>
  </section>

  {#if exercises.length}
    <section class="panel">
      <h3>Übungs-Fortschritt</h3>
      <span class="sub muted">Verlauf einer Übung über die Zeit</span>

      <div class="ex-controls">
        <select class="ex-select" bind:value={selectedExercise}>
          {#each exercises as name (name)}
            <option value={name}>{name}</option>
          {/each}
        </select>
        <div class="metric-toggle">
          {#each PROGRESS_METRICS as m (m.id)}
            <button
              class="mt-btn"
              class:active={metric === m.id}
              onclick={() => (metric = m.id)}
            >
              {m.label}
            </button>
          {/each}
        </div>
      </div>

      {#if chart}
        <div class="chart-meta">
          <span class="cm-current">
            {chart.last}{metricMeta.unit ? " " + metricMeta.unit : ""}
          </span>
          {#if progress.length > 1}
            <span class="cm-delta" class:up={delta > 0} class:down={delta < 0}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}
              {Math.abs(delta)}{metricMeta.unit ? " " + metricMeta.unit : ""}
            </span>
          {/if}
        </div>
        <svg class="chart" viewBox="0 0 {W} {H}" preserveAspectRatio="none">
          <polyline
            points={chart.line}
            fill="none"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          {#each chart.coords as c (c.date)}
            <circle cx={c.cx} cy={c.cy} r="3" fill="var(--accent)" />
          {/each}
        </svg>
        <div class="chart-axis">
          <span>{shortDate(progress[0].date)}</span>
          <span>{shortDate(progress[progress.length - 1].date)}</span>
        </div>
      {:else}
        <p class="muted">Für diese Übung sind noch keine Werte erfasst.</p>
      {/if}
    </section>
  {/if}

  <section class="panel">
    <h3>Verteilung nach Typ</h3>
    {#if stats.byType.length}
      <div class="types">
        {#each stats.byType as t (t.id)}
          {@const pct = stats.total ? Math.round((t.count / stats.total) * 100) : 0}
          <div class="type-row">
            <div class="type-head">
              <span class="swatch" style="background: {t.color}"></span>
              <span class="t-label">{t.label}</span>
              <span class="t-count">{t.count} · {pct}%</span>
            </div>
            <div class="t-bar">
              <div class="t-fill" style="width: {pct}%; background: {t.color}"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="muted">Noch keine erledigten Einheiten.</p>
    {/if}
  </section>
</div>

<style>
  .stats {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  .s-num {
    font-size: 28px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }
  .s-lbl {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }
  .panel h3 {
    font-size: 15px;
    margin-bottom: 2px;
  }
  .sub {
    font-size: 12px;
    display: block;
    margin-bottom: 16px;
  }
  .trend {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    align-items: end;
    height: 160px;
  }
  .bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
  }
  .bar-wrap {
    flex: 1 1 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }
  .bar-val {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .bar {
    width: 100%;
    max-width: 34px;
    background: var(--c-zone2);
    border-radius: 6px 6px 0 0;
    min-height: 3px;
    transition: height 0.3s ease;
  }
  .bar.empty {
    background: var(--border);
  }
  .bar-lbl {
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .ex-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .ex-select {
    width: 100%;
  }
  .metric-toggle {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .mt-btn {
    flex: 1 1 auto;
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
    background: rgba(91, 141, 239, 0.12);
    border-color: var(--accent);
    color: var(--accent);
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
  .types {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .type-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .swatch {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex: 0 0 auto;
  }
  .t-label {
    font-size: 13.5px;
    font-weight: 600;
  }
  .t-count {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .t-bar {
    height: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .t-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
  }
  @media (max-width: 480px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .trend {
      gap: 4px;
    }
    .bar-lbl {
      font-size: 9px;
    }
  }
</style>
