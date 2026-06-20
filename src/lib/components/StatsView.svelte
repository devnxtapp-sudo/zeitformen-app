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

  function weekLabel(monday) {
    const d = parseYmd(monday);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  // Flowbite admin-dashboard dark theme defaults shared by both charts.
  const CHART_BASE = {
    fontFamily: "Inter, sans-serif",
    toolbar: { show: false },
    background: "transparent",
    animations: { enabled: true },
  };
  const AXIS_LABEL = { style: { colors: "#9ca3af", fontFamily: "Inter, sans-serif" } };

  // Svelte action: lazy-load ApexCharts (own chunk, only fetched when a chart
  // view is opened), then mount an instance and keep it in sync with `options`.
  function apexChart(node, options) {
    let chart = null;
    let current = options;
    let destroyed = false;
    import("apexcharts").then(({ default: ApexCharts }) => {
      if (destroyed) return;
      chart = new ApexCharts(node, current);
      chart.render();
    });
    return {
      update(next) {
        current = next;
        if (chart) chart.updateOptions(next, true, true);
      },
      destroy() {
        destroyed = true;
        if (chart) chart.destroy();
      },
    };
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

  // summary values derived from the progress series (kept for the meta header)
  let chart = $derived.by(() => {
    const pts = progress;
    if (pts.length === 0) return null;
    const values = pts.map((p) => p.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      first: values[0],
      last: values[values.length - 1],
    };
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

  // ---- ApexCharts options (Flowbite admin-dashboard dark theme) ----

  // Weekly training count — rounded bar columns.
  let weeklyOptions = $derived({
    chart: { ...CHART_BASE, type: "bar", height: 260 },
    theme: { mode: "dark" },
    series: [
      { name: "Einheiten", data: stats.weekly.map((w) => w.count) },
    ],
    xaxis: {
      categories: stats.weekly.map((w) => weekLabel(w.monday)),
      labels: AXIS_LABEL,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        ...AXIS_LABEL,
        formatter: (v) => Math.round(v),
      },
    },
    colors: ["#ef562f"],
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "55%", borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#374151",
      strokeDashArray: 4,
      padding: { left: 4, right: 4 },
    },
    legend: { show: false },
    tooltip: { theme: "dark", y: { formatter: (v) => `${Math.round(v)} Einheiten` } },
  });

  // Per-exercise progression — area trend (like the dashboard revenue chart).
  let progressOptions = $derived({
    chart: { ...CHART_BASE, type: "area", height: 260 },
    theme: { mode: "dark" },
    series: [
      {
        name: metricMeta?.label ?? "Wert",
        data: progress.map((p) => p.value),
      },
    ],
    xaxis: {
      categories: progress.map((p) => shortDate(p.date)),
      labels: { ...AXIS_LABEL, hideOverlappingLabels: true, rotate: 0 },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        ...AXIS_LABEL,
        formatter: (v) =>
          metricMeta?.unit ? `${Math.round(v)} ${metricMeta.unit}` : Math.round(v),
      },
    },
    colors: ["#fe795d", "#ef562f"],
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.45, opacityTo: 0, shade: "dark" },
    },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: progress.length === 1 ? 5 : 0, colors: ["#fe795d"] },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#374151",
      strokeDashArray: 4,
      padding: { left: 4, right: 4 },
    },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (v) =>
          metricMeta?.unit ? `${v} ${metricMeta.unit}` : `${v}`,
      },
    },
  });
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
    <div class="rounded-xl border border-line bg-card p-4">
      <div class="apex" use:apexChart={weeklyOptions}></div>
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
        <div class="rounded-xl border border-line bg-card p-4">
          {#key selectedExercise + "::" + metric}
            <div class="apex" use:apexChart={progressOptions}></div>
          {/key}
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
    text-shadow: var(--glow);
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
  .apex {
    min-height: 260px;
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
    background: rgba(var(--accent-rgb), 0.12);
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
  }
</style>
