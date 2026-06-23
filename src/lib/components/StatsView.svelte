<script>
  import {
    computeStats,
    weekOverview,
    dayStreak,
    exerciseNames,
    exerciseProgress,
    loggedDays,
    personalRecords,
    PROGRESS_METRICS,
  } from "../stats.js";
  import { weekDates, todayKey, parseYmd, ymd, lastNWeekMondays, weekDatesFrom, dayKeyOf } from "../dateutil.js";
  import ActivityRow from "./ActivityRow.svelte";
  import { sportIcon } from "../icons.js";
  import Flame from "@lucide/svelte/icons/flame";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";

  let { goal, initialExercise = null, onsync = null } = $props();

  const week = weekDates();
  const today = todayKey();
  let stats = $derived(computeStats(goal));
  let overview = $derived(weekOverview(goal, week, dayKeyOf(today)));
  let streak = $derived(dayStreak(goal, today));

  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const n = (x.getUTCDay() + 6) % 7;
    x.setUTCDate(x.getUTCDate() - n + 3);
    const f = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((x - f) / 86400000 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  }

  // log-metric helpers (used across the windowed aggregations below)
  function metricNum(e, re) {
    for (const [k, v] of Object.entries(e.metrics ?? {})) {
      if (re.test(k)) {
        const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }
  const durOf = (e) => metricNum(e, /dauer/i);
  const distOf = (e) => metricNum(e, /distanz/i);
  const isStrength = (l) => /kraft|strength|gym|körper|bein|push|pull/i.test(l || "");

  // ---- period selector → time window that drives the stats ----
  const periods = ["7 Tage", "4 Wochen", "3 Monate", "Gesamt"];
  let period = $state("4 Wochen");
  let periodDays = $derived(period === "7 Tage" ? 7 : period === "4 Wochen" ? 28 : period === "3 Monate" ? 90 : null);
  let winStart = $derived(periodDays ? ymd(new Date(parseYmd(today).getTime() - (periodDays - 1) * 86400000)) : null);
  const inWin = (d) => !winStart || d >= winStart;
  let periodSub = $derived(period === "Gesamt" ? "gesamt" : period === "7 Tage" ? "letzte 7 Tage" : period === "4 Wochen" ? "letzte 4 Wochen" : "letzte 3 Monate");

  function entriesForDates(dates) {
    const set = new Set(dates);
    const out = [];
    for (const [k, e] of Object.entries(goal.log ?? {})) if (set.has(k.split("#")[0])) out.push(e);
    return out;
  }
  // chart buckets: 7 daily bars for "7 Tage", otherwise weekly across the window
  let buckets = $derived.by(() => {
    if (period === "7 Tage") {
      const base = parseYmd(today).getTime();
      return Array.from({ length: 7 }, (_, i) => {
        const d = ymd(new Date(base - (6 - i) * 86400000));
        return { label: parseYmd(d).toLocaleDateString("de-DE", { weekday: "short" }), dates: [d], weekly: false };
      });
    }
    const n = period === "4 Wochen" ? 4 : period === "3 Monate" ? 13 : Math.max(1, stats.weekly.length);
    return lastNWeekMondays(n, parseYmd(today)).map((mon) => ({
      label: "KW " + isoWeek(parseYmd(mon)),
      dates: Object.values(weekDatesFrom(mon)),
      weekly: true,
    }));
  });
  let bucketLabels = $derived(buckets.map((b) => b.label));
  let bucketCounts = $derived(buckets.map((b) => entriesForDates(b.dates).length));
  let targetSeries = $derived(buckets.map((b) => (b.weekly ? overview.planned || 0 : null)));

  // ---- KPIs (windowed) ----
  let unitsInWindow = $derived.by(() => {
    let n = 0;
    for (const k of Object.keys(goal.log ?? {})) if (inWin(k.split("#")[0])) n++;
    return n;
  });
  let volumeInWindow = $derived.by(() => {
    let sec = 0;
    for (const [k, e] of Object.entries(goal.log ?? {})) {
      if (!inWin(k.split("#")[0])) continue;
      sec += Number(e.durationSec) || (durOf(e) ?? 0) * 60;
    }
    return Math.round((sec / 3600) * 10) / 10;
  });
  let unitsDelta = $derived.by(() => {
    if (!periodDays || !winStart) return 0;
    const prevStart = ymd(new Date(parseYmd(winStart).getTime() - periodDays * 86400000));
    let cur = 0, prev = 0;
    for (const k of Object.keys(goal.log ?? {})) {
      const d = k.split("#")[0];
      if (d >= winStart) cur++;
      else if (d >= prevStart) prev++;
    }
    return cur - prev;
  });

  // ---- recent activities (real, from log) ----
  let activities = $derived.by(() => {
    const log = goal.log ?? {};
    return Object.entries(log)
      .map(([k, e]) => ({ date: k.split("#")[0], ...e }))
      .filter((e) => inWin(e.date) && (e.title || e.typeLabel || e.exercises?.length || e.metrics))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6)
      .map((e) => {
        const stat = [];
        for (const [, v] of Object.entries(e.metrics ?? {})) if (v != null && v !== "") stat.push(String(v));
        const sets = (e.exercises ?? []).reduce((n, ex) => n + (ex.sets?.length ?? 0), 0);
        if (sets) stat.push(`${sets} Sätze`);
        return {
          title: e.title || e.typeLabel || "Training",
          type: e.typeLabel || "",
          color: e.typeColor || "#64748b",
          actType: e.actType || e.typeLabel || e.title,
          date: parseYmd(e.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }),
          stats: stat.slice(0, 3),
        };
      });
  });

  // ---- heatmap (real): 12 weeks × 7 days ----
  let heatmap = $derived.by(() => {
    const counts = new Map();
    for (const k of Object.keys(goal.log ?? {})) {
      const d = k.split("#")[0];
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const mondays = lastNWeekMondays(12, parseYmd(today));
    return mondays.map((mon) => {
      const days = weekDatesFrom(mon);
      const cells = ["mo", "di", "mi", "do", "fr", "sa", "so"].map((dk) => {
        const c = counts.get(days[dk]) ?? 0;
        return c >= 3 ? 3 : c;
      });
      const m = parseYmd(mon).toLocaleDateString("de-DE", { month: "short" });
      return { month: m, cells };
    });
  });
  const HM_BG = ["var(--surface-3)", "rgba(34,197,94,0.3)", "rgba(34,197,94,0.55)", "#22c55e"];

  // ---- Aktivitäten list (expandable, real from synced data) ----
  function sportMeta(type) {
    const t = String(type || "").toLowerCase();
    if (/run/.test(t)) return { color: "var(--c-streak)", emoji: "🏃" };
    if (/ride|bike|cycl|virtual/.test(t)) return { color: "var(--accent)", emoji: "🚴" };
    if (/swim/.test(t)) return { color: "var(--c-cyan)", emoji: "🏊" };
    if (/weight|strength|workout/.test(t)) return { color: "#f0a830", emoji: "🏋️" };
    if (/walk|hike/.test(t)) return { color: "var(--c-purple)", emoji: "🚶" };
    return { color: "var(--c-cyan)", emoji: "🔥" };
  }
  let actList = $derived.by(() => {
    const log = goal.log ?? {};
    return Object.entries(log)
      .map(([k, e]) => ({ k, date: k.split("#")[0], e }))
      .filter(({ date, e }) => inWin(date) && (distOf(e) != null || e.durationSec != null || durOf(e) != null))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 12)
      .map(({ k, date, e }) => {
        const iv = e.iv ?? {};
        const sp = sportMeta(e.actType);
        return {
          key: k,
          actId: e.actId ?? null,
          name: e.note || e.typeLabel || "Training",
          dateLabel: parseYmd(date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" }),
          klasse: e.typeLabel || null,
          color: e.typeColor || sp.color,
          actType: e.actType || e.typeLabel || "",
          km: distOf(e),
          durSec: Number(e.durationSec) || (durOf(e) ?? 0) * 60 || null,
          hf: metricNum(e, /puls|hf/i),
          maxHr: iv.maxHr ?? null,
          cadence: iv.cadence ?? null,
          elev: iv.elevation ?? null,
          intensity: iv.intensity ?? null,
          load: iv.load ?? null,
          trimp: iv.trimp ?? null,
          ctl: iv.ctl ?? null,
          atl: iv.atl ?? null,
          calories: iv.calories ?? null,
        };
      });
  });
  // Ø pace (min/km) per bucket from synced runs
  let realPace = $derived(
    buckets.map((b) => {
      const ps = [];
      for (const e of entriesForDates(b.dates)) {
        const d = distOf(e), t = durOf(e);
        if (d > 0 && t > 0) { const p = t / d; if (p > 2 && p < 12) ps.push(p); }
      }
      return ps.length ? Math.round((ps.reduce((a, c) => a + c, 0) / ps.length) * 100) / 100 : null;
    }),
  );
  let hasPace = $derived(realPace.filter((v) => v != null).length >= 2);
  // HF-zone distribution (seconds → %) within the window; Kraft = strength duration
  let realZones = $derived.by(() => {
    const z = [0, 0, 0, 0];
    let any = false;
    for (const [k, e] of Object.entries(goal.log ?? {})) {
      if (!inWin(k.split("#")[0])) continue;
      if (Array.isArray(e.hrZones) && e.hrZones.length) {
        any = true;
        const a = e.hrZones.map((x) => Number(x) || 0);
        z[0] += (a[0] || 0) + (a[1] || 0);
        z[1] += a[2] || 0;
        z[2] += a.slice(3).reduce((s, x) => s + x, 0);
      } else if (isStrength(e.typeLabel)) {
        const t = durOf(e);
        if (t) z[3] += t * 60;
      }
    }
    const total = z.reduce((s, x) => s + x, 0);
    if (!any || total <= 0) return null;
    return z.map((s) => Math.round((s / total) * 100));
  });
  // volume (h) by training type within the window
  let realModality = $derived.by(() => {
    const byType = new Map();
    let any = false;
    for (const [k, e] of Object.entries(goal.log ?? {})) {
      if (!inWin(k.split("#")[0])) continue;
      const t = durOf(e);
      if (!t) continue;
      any = true;
      const label = e.typeLabel || "Training", color = e.typeColor || "#64748b";
      if (!byType.has(label)) byType.set(label, { label, color, min: 0 });
      byType.get(label).min += t;
    }
    if (!any) return null;
    return [...byType.values()].map((s) => ({ label: s.label, color: s.color, hours: Math.round((s.min / 60) * 10) / 10 }));
  });

  // ---- per-exercise progression (real) ----
  let days = $derived(loggedDays(goal));
  let selectedDay = $state("");
  let dayFilter = $derived(selectedDay || null);
  let exercises = $derived(exerciseNames(goal, dayFilter));
  let selectedExercise = $state(null);
  let metric = $state("topWeight");
  let progEl = $state(null);
  let appliedInit = "";
  // preselect an exercise that arrived via the global search (once per value)
  $effect(() => {
    if (initialExercise && initialExercise !== appliedInit && exercises.includes(initialExercise)) {
      appliedInit = initialExercise;
      selectedExercise = initialExercise;
      requestAnimationFrame(() => progEl?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  });
  $effect(() => {
    if (exercises.length && !exercises.includes(selectedExercise)) selectedExercise = exercises[0];
    else if (!exercises.length) selectedExercise = null;
  });
  let progress = $derived(selectedExercise ? exerciseProgress(goal, selectedExercise, metric, dayFilter) : []);
  let metricMeta = $derived(PROGRESS_METRICS.find((m) => m.id === metric));

  // ---- Chart.js (lazy) ----
  let ChartLib = null;
  function chartjs(node, config) {
    let c = null, killed = false;
    (async () => {
      if (!ChartLib) {
        ChartLib = (await import("chart.js/auto")).default;
        ChartLib.defaults.color = "#64748b";
        ChartLib.defaults.font.family = "Inter";
        ChartLib.defaults.font.size = 11;
      }
      if (killed) return;
      c = new ChartLib(node, config);
    })();
    return { destroy() { killed = true; c?.destroy(); } };
  }
  const GRID = "rgba(255,255,255,0.05)";
  const TIP = { backgroundColor: "#1c2333", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10 };

  let volCfg = $derived({
    type: "bar",
    data: { labels: bucketLabels, datasets: [
      { label: "Einheiten", data: bucketCounts, backgroundColor: bucketCounts.map((_, i) => (i === bucketCounts.length - 1 ? "rgba(59,130,246,0.85)" : "rgba(59,130,246,0.35)")), borderRadius: 4, borderSkipped: false, order: 2 },
      { label: "Ziel", data: targetSeries, type: "line", borderColor: "rgba(6,182,212,0.6)", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.4, order: 1 },
    ] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: TIP }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, beginAtZero: true, ticks: { precision: 0 } } } },
  });
  let progCfg = $derived({
    type: "line",
    data: { labels: progress.map((p) => parseYmd(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })), datasets: [
      { label: metricMeta?.label, data: progress.map((p) => p.value), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", borderWidth: 2.5, pointBackgroundColor: "#3b82f6", pointRadius: 4, tension: 0.4, fill: true },
    ] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: TIP }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false } } } },
  });

  // ---- placeholder charts (demo data — kein echtes Tracking vorhanden) ----
  const demoWeeks = ["KW 18", "KW 19", "KW 20", "KW 21", "KW 22", "KW 23", "KW 24", "KW 25"];
  const zoneCfg = { type: "doughnut", data: { datasets: [{ data: [55, 25, 12, 8], backgroundColor: ["#22c55e", "#f97316", "#ef4444", "#a78bfa"], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: false, cutout: "70%", plugins: { legend: { display: false }, tooltip: { enabled: false } } } };
  const modalCfg = { type: "bar", data: { labels: ["KW 22", "KW 23", "KW 24", "KW 25"], datasets: [
    { label: "Laufen", data: [2.8, 2.5, 2.6, 2.3], backgroundColor: "rgba(249,115,22,0.75)", borderRadius: 3, borderSkipped: false },
    { label: "Kraft", data: [1.5, 1.4, 1.5, 1.4], backgroundColor: "rgba(167,139,250,0.75)", borderRadius: 3, borderSkipped: false },
    { label: "Schwimmen", data: [0.9, 0.8, 1.0, 0.9], backgroundColor: "rgba(6,182,212,0.75)", borderRadius: 3, borderSkipped: false },
    { label: "Rad", data: [0.7, 0.7, 0.7, 0.7], backgroundColor: "rgba(59,130,246,0.75)", borderRadius: 3, borderSkipped: false },
  ] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: TIP }, scales: { x: { stacked: true, grid: { color: GRID }, border: { display: false } }, y: { stacked: true, grid: { color: GRID }, border: { display: false }, beginAtZero: true } } } };
  const paceCfg = {
    type: "line",
    data: { labels: demoWeeks, datasets: [{ label: "Ø Pace (min/km)", data: [6.45, 6.38, 6.31, 6.28, 6.2, 6.15, 6.1, 6.05], borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", borderWidth: 2.5, pointBackgroundColor: "#22c55e", pointRadius: 4, tension: 0.4, fill: true }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (ctx) => { const v = ctx.raw, m = Math.floor(v), s = Math.round((v - m) * 60); return ` ${m}:${String(s).padStart(2, "0")} min/km`; } } } }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, reverse: true, min: 5.8, max: 6.6, ticks: { callback: (v) => { const m = Math.floor(v), s = Math.round((v - m) * 60); return `${m}:${String(s).padStart(2, "0")}`; } } } } },
  };

  const zones = [
    { label: "Zone 1–2", pct: 55, color: "var(--c-success)" },
    { label: "Zone 3", pct: 25, color: "var(--c-streak)" },
    { label: "Zone 4–5", pct: 12, color: "#ef4444" },
    { label: "Kraft", pct: 8, color: "var(--c-purple)" },
  ];
  const prsDemo = [
    { kind: "run", name: "5 km Lauf", sub: "vor 2 Wochen", value: "22:14", delta: "↓ 0:38 min", badge: "PR" },
    { kind: "swim", name: "100m Kraul", sub: "vor 1 Woche", value: "1:48", delta: "↓ 3 sek", badge: "NEU" },
    { kind: "strength", name: "Back Squat", sub: "vor 3 Wochen", value: "107.5 kg", delta: "↑ 2.5 kg", badge: "PR" },
    { kind: "run", name: "1 km Pace", sub: "vor 1 Woche", value: "4:02/km", delta: "↓ 0:08", badge: "PR" },
  ];
  let realPRs = $derived(personalRecords(goal, today));
  let prsShown = $derived(realPRs.length ? realPRs : prsDemo);
  let prSub = $derived(realPRs.length ? "Kraft (Log) + Distanz (intervals.icu)" : "Demo · füllt sich mit Training & Sync");

  // ---- chosen (real if synced, else demo placeholder) ----
  const ZONE_LABELS = [
    { label: "Zone 1–2", color: "var(--c-success)" },
    { label: "Zone 3", color: "var(--c-streak)" },
    { label: "Zone 4–5", color: "#ef4444" },
    { label: "Kraft", color: "var(--c-purple)" },
  ];
  let zonePct = $derived(realZones ?? [55, 25, 12, 8]);
  let zoneBars = $derived(ZONE_LABELS.map((z, i) => ({ ...z, pct: zonePct[i] ?? 0 })));
  let zoneDonutShown = $derived({ type: "doughnut", data: { datasets: [{ data: zonePct, backgroundColor: ["#22c55e", "#f97316", "#ef4444", "#a78bfa"], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: false, cutout: "70%", plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
  let zoneSub = $derived(realZones ? "Zeit pro HF-Zone · intervals.icu" : "Demo · via intervals.icu");

  let paceShown = $derived(hasPace ? {
    type: "line",
    data: { labels: bucketLabels, datasets: [{ label: "Ø Pace", data: realPace, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", borderWidth: 2.5, pointBackgroundColor: "#22c55e", pointRadius: 4, tension: 0.4, fill: true, spanGaps: true }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (ctx) => { const v = ctx.raw; if (v == null) return ""; const m = Math.floor(v), s = Math.round((v - m) * 60); return ` ${m}:${String(s).padStart(2, "0")} min/km`; } } } }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, reverse: true, ticks: { callback: (v) => { const m = Math.floor(v), s = Math.round((v - m) * 60); return `${m}:${String(s).padStart(2, "0")}`; } } } } },
  } : paceCfg);
  let paceSub = $derived(hasPace ? "Ø Pace pro Woche · intervals.icu" : "Demo · via intervals.icu");

  let modalLegend = $derived(realModality ?? [
    { label: "Laufen", color: "var(--c-streak)", hours: 10.2 },
    { label: "Kraft", color: "var(--c-purple)", hours: 5.8 },
    { label: "Schwimmen", color: "var(--c-cyan)", hours: 3.6 },
    { label: "Rad", color: "var(--accent)", hours: 2.8 },
  ]);
  let modalShown = $derived(realModality ? {
    type: "bar",
    data: { labels: realModality.map((m) => m.label), datasets: [{ data: realModality.map((m) => m.hours), backgroundColor: realModality.map((m) => m.color), borderRadius: 4, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: TIP }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, beginAtZero: true } } },
  } : modalCfg);
  let modalSub = $derived(realModality ? "Stunden je Typ · letzte 4 Wochen" : "Demo · nach Modalität");

  let dataSig = $derived((hasPace ? "p" : "") + (realZones ? "z" : "") + (realModality ? "m" : ""));
  let chartKey = $derived(bucketCounts.join(",") + "|" + period + "|" + selectedDay + selectedExercise + metric + "|" + dataSig);
</script>

<div class="stats">
  <div class="page-header">
    <div>
      <div class="page-title">Statistik</div>
      <div class="page-sub">{goal.name} · Stand: {parseYmd(today).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>
    <div class="period-tabs">
      {#each periods as p (p)}
        <div class="period-tab" class:active={period === p} onclick={() => (period = p)}>{p}</div>
      {/each}
    </div>
  </div>

  <!-- KPIs (real) -->
  <div class="grid-4">
    <div class="kpi-card kpi-blue">
      <div class="kpi-label">Einheiten</div>
      <div class="kpi-value">{unitsInWindow}</div>
      <div class="kpi-sub">{periodSub}</div>
      {#if unitsDelta !== 0}<div class="kpi-delta {unitsDelta > 0 ? 'delta-up' : 'delta-down'}">{#if unitsDelta > 0}<ArrowUp size={11} />{:else}<ArrowDown size={11} />{/if} {Math.abs(unitsDelta)} vs. Vorperiode</div>{/if}
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-label">Volumen</div>
      <div class="kpi-value">{volumeInWindow} h</div>
      <div class="kpi-sub">{periodSub}</div>
    </div>
    <div class="kpi-card kpi-orange">
      <div class="kpi-label">Completion Rate</div>
      <div class="kpi-value">{overview.pct}%</div>
      <div class="kpi-sub">{overview.done}/{overview.planned} diese Woche</div>
    </div>
    <div class="kpi-card kpi-purple">
      <div class="kpi-label">Streak</div>
      <div class="kpi-value" style="display:inline-flex;align-items:center;gap:8px">{streak.current} <Flame size={22} /></div>
      <div class="kpi-sub">Tage in Folge</div>
      {#if streak.current > 0 && streak.current >= streak.best}<div class="kpi-delta" style="color:var(--c-streak)">Persönlicher Rekord</div>{:else if streak.best > 0}<div class="kpi-sub">Rekord {streak.best}</div>{/if}
    </div>
  </div>

  <!-- Volumen + Aktivitäten -->
  <div class="grid-main-side">
    <div class="card">
      <div class="card-head">
        <div><div class="card-title">Trainingsvolumen</div><div class="card-sub">Erledigte Einheiten pro Woche + Ziel</div></div>
        <div class="legend"><span class="lg"><i style="background:var(--accent)"></i>Erledigt</span><span class="lg"><i style="background:var(--c-cyan);opacity:.6"></i>Ziel</span></div>
      </div>
      <div class="chart-wrap">{#key chartKey}<canvas use:chartjs={volCfg} height="130"></canvas>{/key}</div>
    </div>

    <div class="card">
      <div class="card-head" style="padding-bottom:12px"><div class="card-title">Letzte Aktivitäten</div></div>
      <div class="activity-list">
        {#each activities as a (a.title + a.date)}
          {@const AI = sportIcon(a.actType)}
          <div class="activity-item">
            <div class="activity-icon" style="background:{a.color}22;color:{a.color}"><AI size={15} /></div>
            <div style="flex:1;min-width:0">
              <div class="activity-title">{a.title}</div>
              <div class="activity-meta">{a.type}</div>
              {#if a.stats.length}<div class="activity-stats">{#each a.stats as s}<div class="activity-stat"><span>{s}</span></div>{/each}</div>{/if}
            </div>
            <div class="activity-time">{a.date}</div>
          </div>
        {/each}
        {#if !activities.length}<p class="empty">Noch keine erfassten Einheiten.</p>{/if}
      </div>
    </div>
  </div>

  <!-- Pace (Demo) + Zonen (Demo) + PRs (Demo) -->
  <div class="grid-3">
    <div class="card">
      <div class="card-head">
        <div><div class="card-title">Lauf-Pace Entwicklung</div><div class="card-sub">{paceSub}</div></div>
        <span style="background:rgba(34,197,94,0.12);color:var(--c-success);font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid rgba(34,197,94,0.2)">↓ Verbesserung</span>
      </div>
      <div class="chart-wrap-sm">{#key dataSig}<canvas use:chartjs={paceShown} height="120"></canvas>{/key}</div>
    </div>

    <div class="card">
      <div class="card-head" style="padding-bottom:14px"><div><div class="card-title">Zonenverteilung</div><div class="card-sub">{zoneSub}</div></div></div>
      <div style="padding:0 20px 6px;display:flex;align-items:center;gap:16px">
        {#key dataSig}<canvas use:chartjs={zoneDonutShown} width="80" height="80" style="flex-shrink:0"></canvas>{/key}
        <div class="zone-row" style="flex:1">
          {#each zoneBars as z (z.label)}
            <div class="zone-item">
              <div class="zone-label" style="color:{z.color}">{z.label}</div>
              <div class="zone-bar-wrap"><div class="zone-bar-fill" style="width:{z.pct}%;background:{z.color}"></div></div>
              <div class="zone-pct">{z.pct}%</div>
            </div>
          {/each}
        </div>
      </div>
      <div style="padding:8px 20px 16px;font-size:11px;color:var(--text-muted)">80/20-Regel: <span style="color:var(--c-success);font-weight:700">gut eingehalten</span></div>
    </div>

    <div class="card">
      <div class="card-head" style="padding-bottom:0"><div><div class="card-title">Persönliche Bestleistungen</div><div class="card-sub">{prSub}</div></div></div>
      <div class="pr-list">
        {#each prsShown as p (p.kind ? p.kind + p.name : p.name)}
          {@const PI = sportIcon(p.kind)}
          <div class="pr-item">
            <div class="pr-icon" style="background:var(--surface-3)"><PI size={15} /></div>
            <div style="flex:1"><div class="pr-name">{p.name}</div><div class="pr-sub">{p.sub}</div></div>
            <div><div class="pr-value">{p.value}</div>{#if p.delta}<div class="pr-delta delta-up">{p.delta}</div>{/if}</div>
            <span class="pr-badge {p.badge === 'NEU' ? 'badge-new' : 'badge-pr'}">{p.badge}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Übungs-Fortschritt (real) -->
  <div class="card" bind:this={progEl}>
    <div class="card-head"><div><div class="card-title">Übungs-Fortschritt</div><div class="card-sub">Verlauf nach Trainingstag + Übung</div></div></div>
    {#if exercises.length}
      <div class="ex-controls">
        {#if days.length > 1}
          <select class="ex-select" bind:value={selectedDay}><option value="">Alle Tage</option>{#each days as d (d.key)}<option value={d.key}>{d.label}</option>{/each}</select>
        {/if}
        <select class="ex-select" bind:value={selectedExercise}>{#each exercises as n (n)}<option value={n}>{n}</option>{/each}</select>
      </div>
      <div class="metric-toggle">{#each PROGRESS_METRICS as m (m.id)}<button class="mt-btn" class:active={metric === m.id} onclick={() => (metric = m.id)}>{m.label}</button>{/each}</div>
      {#if progress.length}
        <div class="chart-wrap">{#key chartKey}<canvas use:chartjs={progCfg} height="90"></canvas>{/key}</div>
      {:else}
        <p class="empty">Keine Werte für diese Übung.</p>
      {/if}
    {:else}
      <p class="empty">Noch keine Übungen mit Sätzen geloggt — dokumentiere Sätze im Training.</p>
    {/if}
  </div>

  <!-- Heatmap (real) + Modalität (Demo) -->
  <div class="grid-2">
    <div class="card">
      <div class="card-head" style="padding-bottom:14px">
        <div><div class="card-title">Trainingsaktivität</div><div class="card-sub">Letzte 12 Wochen</div></div>
        <div class="hm-legend">weniger {#each HM_BG as c}<i style="background:{c}"></i>{/each} mehr</div>
      </div>
      <div style="padding:0 20px 20px;display:flex;gap:3px">
        {#each heatmap as col, ci (ci)}
          <div style="display:flex;flex-direction:column;gap:3px;flex:1">
            {#each col.cells as lvl, di (di)}
              <div class="hm-cell" style="background:{HM_BG[lvl]}" title={col.month}></div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <div class="card-head" style="padding-bottom:12px"><div><div class="card-title">Trainingsaufteilung</div><div class="card-sub">{modalSub}</div></div></div>
      <div class="chart-wrap-sm" style="padding-top:8px">{#key dataSig}<canvas use:chartjs={modalShown} height="160"></canvas>{/key}</div>
      <div style="padding:0 20px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        {#each modalLegend as m (m.label)}
          <span class="ml-leg"><i style="background:{m.color}"></i>{m.label} — {m.hours} h</span>
        {/each}
      </div>
    </div>
  </div>

  <!-- Aktivitäten (intervals.icu, ausklappbar) -->
  <div class="card">
    <div class="act-head">
      <div class="card-title">Aktivitäten</div>
      {#if onsync}<button class="sync-btn" onclick={() => onsync()}>↻ Synchronisieren</button>{/if}
    </div>
    {#if actList.length}
      {#each actList as act (act.key)}
        <ActivityRow activity={act} />
      {/each}
    {:else}
      <p class="empty">Noch keine Aktivitäten — verbinde intervals.icu und synchronisiere.</p>
    {/if}
  </div>
</div>

<style>
  .stats { display: flex; flex-direction: column; gap: 16px; }
  .act-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .sync-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--c-cyan); cursor: pointer; font-family: var(--font); }
  .sync-btn:hover { border-color: var(--c-cyan); }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .page-title { font-size: 20px; font-weight: 800; color: var(--text); }
  .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
  .period-tabs { display: flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px; }
  .period-tab { padding: 5px 14px; border-radius: 5px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.12s; }
  .period-tab.active { background: var(--card); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-main-side { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
  @media (max-width: 1100px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } .grid-3, .grid-2, .grid-main-side { grid-template-columns: 1fr; } }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .card-head { padding: 16px 20px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .card-title { font-size: 13px; font-weight: 700; color: var(--text); }
  .card-sub { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
  .legend { display: flex; gap: 12px; }
  .lg { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
  .lg i { width: 10px; height: 3px; border-radius: 2px; }
  .chart-wrap { padding: 16px 20px 20px; }
  .chart-wrap-sm { padding: 12px 16px 16px; }
  .empty { padding: 16px 20px; font-size: 13px; color: var(--text-dim); }

  .kpi-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; position: relative; overflow: hidden; }
  .kpi-card::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .kpi-blue::after { background: linear-gradient(90deg, var(--accent), transparent); }
  .kpi-green::after { background: linear-gradient(90deg, var(--c-success), transparent); }
  .kpi-orange::after { background: linear-gradient(90deg, var(--c-streak), transparent); }
  .kpi-purple::after { background: linear-gradient(90deg, var(--c-purple), transparent); }
  .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-bottom: 8px; }
  .kpi-value { font-size: 28px; font-weight: 800; line-height: 1; font-feature-settings: "tnum"; }
  .kpi-blue .kpi-value { color: var(--accent); }
  .kpi-green .kpi-value { color: var(--c-success); }
  .kpi-orange .kpi-value { color: var(--c-streak); }
  .kpi-purple .kpi-value { color: var(--c-purple); }
  .kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
  .kpi-delta { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; margin-top: 4px; }
  .delta-up { color: var(--c-success); }
  .delta-down { color: #ef4444; }

  .activity-list { display: flex; flex-direction: column; }
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-icon { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; margin-top: 1px; }
  .activity-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .activity-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .activity-stats { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
  .activity-stat { font-size: 11px; color: var(--text-muted); font-family: var(--mono); }
  .activity-stat span { color: var(--text); font-weight: 600; }
  .activity-time { font-size: 11px; color: var(--text-dim); white-space: nowrap; margin-left: auto; flex-shrink: 0; }

  .ex-controls { display: flex; gap: 8px; padding: 12px 20px 0; flex-wrap: wrap; }
  .ex-select { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--radius-sm); padding: 7px 10px; font-size: 12.5px; font-family: var(--font); }
  .metric-toggle { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 20px 0; }
  .mt-btn { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); border-radius: 999px; padding: 4px 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: var(--font); }
  .mt-btn.active { background: rgba(var(--accent-rgb), 0.15); border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent); }

  .zone-row { display: flex; flex-direction: column; gap: 8px; }
  .zone-item { display: flex; align-items: center; gap: 10px; }
  .zone-label { font-size: 11px; font-weight: 600; width: 64px; flex-shrink: 0; }
  .zone-bar-wrap { flex: 1; height: 8px; background: var(--surface-3); border-radius: 999px; overflow: hidden; }
  .zone-bar-fill { height: 100%; border-radius: 999px; }
  .zone-pct { font-size: 11px; font-weight: 700; color: var(--text); font-family: var(--mono); width: 34px; text-align: right; flex-shrink: 0; }

  .pr-list { display: flex; flex-direction: column; }
  .pr-item { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid var(--border); }
  .pr-item:last-child { border-bottom: none; }
  .pr-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .pr-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .pr-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .pr-value { font-size: 14px; font-weight: 800; color: var(--text); font-family: var(--mono); text-align: right; }
  .pr-delta { font-size: 10px; font-weight: 700; margin-top: 1px; text-align: right; }
  .pr-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  .badge-pr { background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.25); }
  .badge-new { background: rgba(34,197,94,0.12); color: var(--c-success); border: 1px solid rgba(34,197,94,0.2); }

  .hm-legend { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-dim); }
  .hm-legend i { width: 10px; height: 10px; border-radius: 2px; }
  .hm-cell { height: 11px; border-radius: 2px; }
  .ml-leg { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-muted); }
  .ml-leg i { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
</style>
