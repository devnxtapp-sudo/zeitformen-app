<script>
  import ExerciseSwiper from "./ExerciseSwiper.svelte";
  import { weekDates, todayKey, dayKeyOf, parseYmd, ymd } from "../dateutil.js";
  import {
    computeStats,
    weekOverview,
    dayStreak,
    weeklyLoad,
  } from "../stats.js";
  import { formatInterval } from "../seed.js";
  import { updateLogEntry } from "../store.svelte.js";

  let { goal, ongotoplan, onnav } = $props();

  const week = weekDates();
  const today = todayKey();
  const todayDayKey = dayKeyOf(today);

  let todayDay = $derived(goal.days[todayDayKey]);
  let stats = $derived(computeStats(goal));
  let overview = $derived(weekOverview(goal, week, todayDayKey));
  let streak = $derived(dayStreak(goal, today));
  let load = $derived(weeklyLoad(goal));
  let todayType = $derived((goal.types ?? []).find((t) => t.id === todayDay?.typeId) ?? null);

  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const n = (x.getUTCDay() + 6) % 7;
    x.setUTCDate(x.getUTCDate() - n + 3);
    const f = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((x - f) / 86400000 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  }
  let kw = $derived(isoWeek(parseYmd(today)));

  // --- weekly series (last 7 weeks of completed sessions) ---
  let weeks7 = $derived(stats.weekly.slice(-7));
  let weekLabels = $derived(weeks7.map((w) => "KW " + isoWeek(parseYmd(w.monday))));
  let weekCounts = $derived(weeks7.map((w) => w.count));
  let target = $derived(weeks7.map(() => overview.planned || 0));
  let volDelta = $derived.by(() => {
    if (weekCounts.length < 2) return 0;
    const a = weekCounts[weekCounts.length - 2];
    const b = weekCounts[weekCounts.length - 1];
    if (!a) return b > 0 ? 100 : 0;
    return Math.round(((b - a) / a) * 100);
  });

  // last 7 days completed (for streak sparkline)
  let last7 = $derived.by(() => {
    const set = new Set(Object.keys(goal?.log ?? {}).map((k) => k.split("#")[0]));
    const base = parseYmd(today).getTime();
    return Array.from({ length: 7 }, (_, i) =>
      set.has(ymd(new Date(base - (6 - i) * 86400000))) ? 1 : 0,
    );
  });
  let compSeries = $derived(
    weeks7.map((w) => (overview.planned ? Math.round(Math.min(w.count / overview.planned, 1) * 100) : 0)),
  );

  // today's distance + key stats + session steps
  let distance = $derived.by(() => {
    let km = 0;
    for (const iv of todayDay?.session?.intervals ?? []) {
      const n = (Number(iv.repeat) || 1) * (Number(iv.amount) || 0);
      if (/km/i.test(iv.amountUnit || "")) km += n;
      else if (/^m$/i.test(iv.amountUnit || "")) km += n / 1000;
    }
    return km > 0 ? `${Math.round(km * 10) / 10} km` : null;
  });
  let todayStats = $derived.by(() => {
    const s = [];
    if (todayDay?.meta) s.push({ label: "Dauer", value: todayDay.meta });
    if (distance) s.push({ label: "Distanz", value: distance });
    if (todayDay?.session?.intensity) s.push({ label: "Intensität", value: todayDay.session.intensity });
    return s;
  });
  const STEP_ICON = ["🔥", "⚡", "🧊", "🏃", "💪", "🚴"];
  let steps = $derived.by(() => {
    const blocks = (todayDay?.session?.blocks ?? []).filter((b) => b.title?.trim() || b.items?.length);
    if (blocks.length) return blocks.map((b) => ({ title: b.title || "Block", detail: (b.items ?? []).join(" · ") }));
    return (todayDay?.session?.intervals ?? []).map((iv) => ({ title: iv.name || "Übung", detail: formatInterval(iv) }));
  });

  let activeTab = $state("aufbau");
  let started = $state(false);
  function saveWorkout(exercises) {
    updateLogEntry(goal.id, week[todayDayKey], { exercises }, todayDayKey);
  }

  // --- Chart.js (lazy) ---
  let ChartLib = null;
  function chartjs(node, config) {
    let chart = null;
    let killed = false;
    (async () => {
      if (!ChartLib) {
        ChartLib = (await import("chart.js/auto")).default;
        ChartLib.defaults.color = "#64748b";
        ChartLib.defaults.font.family = "Inter";
        ChartLib.defaults.font.size = 11;
      }
      if (killed) return;
      chart = new ChartLib(node, config);
    })();
    return { destroy() { killed = true; chart?.destroy(); } };
  }

  const GRID = "rgba(255,255,255,0.05)";
  let loadCfg = $derived({
    type: "line",
    data: {
      labels: weekLabels,
      datasets: [
        { label: "Erledigt", data: weekCounts, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)", borderWidth: 2.5, pointBackgroundColor: "#3b82f6", pointRadius: 4, pointHoverRadius: 6, tension: 0.4, fill: true },
        { label: "Ziel", data: target, borderColor: "rgba(6,182,212,0.5)", borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, padding: 16, usePointStyle: true } }, tooltip: { backgroundColor: "#1c2333", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10 } },
      scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  const miniOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } };
  let streakCfg = $derived({ type: "bar", data: { labels: last7.map(() => ""), datasets: [{ data: last7, backgroundColor: (c) => (c.raw === 1 ? "rgba(249,115,22,0.8)" : "rgba(255,255,255,0.06)"), borderRadius: 3 }] }, options: miniOpts });
  let loadMiniCfg = $derived({ type: "bar", data: { labels: weekLabels, datasets: [{ data: weekCounts, backgroundColor: weekCounts.map((_, i) => (i === weekCounts.length - 1 ? "#06b6d4" : "rgba(6,182,212,0.25)")), borderRadius: 3 }] }, options: miniOpts });
  let compCfg = $derived({ type: "line", data: { labels: weekLabels, datasets: [{ data: compSeries, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true }] }, options: miniOpts });

  let chartKey = $derived(weekCounts.join(",") + "|" + last7.join(","));

  // --- recent activities feed (real, from synced intervals.icu data) ---
  function metricOf(e, re) {
    for (const [k, v] of Object.entries(e?.metrics ?? {})) {
      if (re.test(k)) {
        const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }
  function sportMeta(type) {
    const t = String(type || "").toLowerCase();
    if (/run/.test(t)) return { label: "Lauf", color: "var(--c-streak)", emoji: "🏃" };
    if (/ride|bike|cycl|virtual/.test(t)) return { label: "Rad", color: "var(--accent)", emoji: "🚴" };
    if (/swim/.test(t)) return { label: "Schwimmen", color: "var(--c-cyan)", emoji: "🏊" };
    if (/weight|strength|workout/.test(t)) return { label: "Kraft", color: "#f0a830", emoji: "🏋️" };
    if (/walk|hike/.test(t)) return { label: "Gehen", color: "var(--c-purple)", emoji: "🚶" };
    return { label: type || "", color: "var(--c-cyan)", emoji: "🔥" };
  }
  function fmtDur(sec) {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
  }
  function fmtPace(minPerKm) {
    const m = Math.floor(minPerKm), s = Math.round((minPerKm - m) * 60);
    return `${m}:${String(s).padStart(2, "0")}/km`;
  }
  let activities = $derived.by(() => {
    const log = goal.log ?? {};
    return Object.entries(log)
      .map(([k, e]) => ({ key: k, date: k.split("#")[0], ...e }))
      .filter((e) => metricOf(e, /distanz/i) != null || e.durationSec != null || metricOf(e, /dauer/i) != null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
      .map((e) => {
        const km = metricOf(e, /distanz/i);
        const sec = Number(e.durationSec) || (metricOf(e, /dauer/i) ?? 0) * 60;
        const hf = metricOf(e, /puls|hf/i);
        const sp = sportMeta(e.actType);
        return {
          key: e.key,
          name: e.note || e.typeLabel || sp.label || "Training",
          type: sp.label || e.typeLabel || "",
          color: e.typeColor || sp.color,
          emoji: sp.emoji,
          dateLabel: parseYmd(e.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" }),
          dist: km > 0 ? `${km} km` : null,
          dur: sec > 0 ? fmtDur(sec) : null,
          pace: km > 0 && sec > 0 ? fmtPace(sec / 60 / km) : null,
          hf: hf > 0 ? `${Math.round(hf)} bpm` : null,
          done: !!e.done,
        };
      });
  });
</script>

<div class="dash">
  <!-- Row: volume chart + today session -->
  <div class="row row-main-side">
    <div class="card">
      <div class="card-head">
        <div>
          <div class="big-num" style="font-size:26px">
            {load.hours}<span style="font-size:18px;color:var(--text-dim)"> h</span>
            <span class="delta {volDelta < 0 ? 'down' : 'up'}" style="font-size:13px;margin-left:6px">
              {volDelta < 0 ? "▼" : "▲"} {Math.abs(volDelta)}%
            </span>
          </div>
          <div class="card-sub">Trainingsvolumen diese Woche{#if load.estimated} · geschätzt{/if}</div>
        </div>
        {#if onnav}<div class="card-action" onclick={() => onnav("stats")}>Trainingsreport →</div>{/if}
      </div>
      <div class="chart-wrap">
        {#key chartKey}<canvas use:chartjs={loadCfg} height="110"></canvas>{/key}
      </div>
      <div class="card-foot">
        <span class="foot-label">Letzte {weeks7.length} Wochen · erledigte Einheiten</span>
        {#if onnav}<span class="foot-link" onclick={() => onnav("stats")}>Alle Statistiken →</span>{/if}
      </div>
    </div>

    <div class="card">
      <div class="card-head" style="padding-bottom:0">
        <div>
          <div class="card-title">Heutige Session</div>
          <div class="card-sub">{new Date(parseYmd(today)).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {#if todayType && !todayDay.isRest}<span class="badge">{todayType.label}</span>{/if}
      </div>

      {#if todayDay.isRest}
        <div class="rest-state">
          <div style="font-size:40px">🌙</div>
          <div class="session-name" style="font-size:16px;margin-top:8px">Ruhetag</div>
          <div class="session-meta">Erholung ist Teil des Plans.</div>
        </div>
      {:else}
        <div class="tabs">
          <div class="tab" class:active={activeTab === "aufbau"} onclick={() => (activeTab = "aufbau")}>Aufbau</div>
          <div class="tab" class:active={activeTab === "details"} onclick={() => (activeTab = "details")}>Details</div>
          <div class="tab" class:active={activeTab === "notizen"} onclick={() => (activeTab = "notizen")}>Notizen</div>
        </div>

        <div class="session-list">
          <div style="padding:12px 0 8px">
            <div style="font-size:16px;font-weight:800">{todayDay.title || "Training"}</div>
            {#if todayDay.session?.objective}<div class="session-meta" style="margin-top:3px">{todayDay.session.objective}</div>{/if}
            {#if todayStats.length}
              <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
                {#each todayStats as s (s.label)}
                  <div><div class="stat-lbl">{s.label}</div><div class="stat-val">{s.value}</div></div>
                {/each}
              </div>
            {/if}
          </div>

          {#if activeTab === "aufbau"}
            {#each steps as st, i (i)}
              <div class="session-item">
                <div class="session-icon" style="background:var(--surface-3)">{STEP_ICON[i % STEP_ICON.length]}</div>
                <div class="min-w-0">
                  <div class="session-name">{st.title}</div>
                  {#if st.detail}<div class="session-meta">{st.detail}</div>{/if}
                </div>
              </div>
            {/each}
            {#if !steps.length}<p class="session-meta" style="padding:8px 0">Kein Aufbau hinterlegt.</p>{/if}
          {:else if activeTab === "details"}
            <p class="session-meta" style="padding:8px 0">{todayDay.session?.objective || "Keine Details hinterlegt."}</p>
          {:else}
            <p class="session-meta" style="padding:8px 0">{todayDay.session?.bonus || "Keine Notizen."}</p>
          {/if}
        </div>

        {#if !started}
          <button class="start-btn" onclick={() => (started = true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Workout starten
          </button>
        {:else}
          <div style="padding:0 16px 16px"><ExerciseSwiper {goal} day={todayDay} onsave={saveWorkout} /></div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Wochenplan -->
  <div class="card">
    <div class="card-head">
      <div>
        <div class="card-title">Wochenplan — KW {kw}</div>
        <div class="card-sub">{goal.name}</div>
      </div>
      <div class="card-action" onclick={() => ongotoplan?.()}>Plan bearbeiten →</div>
    </div>
    <div class="week-wrap">
      <div class="week-row">
        {#each overview.days as d (d.key)}
          <div class="day-cell" class:done={d.status === "done"} class:today={d.isToday} class:rest={d.isRest}>
            <span class="day-lbl">{d.short}</span>
            <div class="day-dot"></div>
            <span class="day-name">{d.label}</span>
          </div>
        {/each}
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between">
        <span class="foot-label">Fortschritt: <b style="color:var(--c-success)">{overview.done} von {overview.planned}</b> Einheiten</span>
        <span class="foot-label" style="font-family:var(--mono)">{overview.pct}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:{overview.pct}%"></div></div>
    </div>
  </div>

  <!-- Mini stats -->
  <div class="row row-3">
    <div class="mini-card">
      <div class="mini-left">
        <div class="mini-label">Streak</div>
        <div class="mini-value" style="color:var(--c-streak)">{streak.current}</div>
        <div class="mini-delta"><span class="delta warn" style="font-size:12px">🔥 {streak.current} {streak.current === 1 ? "Tag" : "Tage"} in Folge</span></div>
      </div>
      <div class="mini-chart">{#key chartKey}<canvas use:chartjs={streakCfg}></canvas>{/key}</div>
    </div>

    <div class="mini-card">
      <div class="mini-left">
        <div class="mini-label">Wochenlast</div>
        <div class="mini-value" style="color:var(--c-cyan)">{load.hours} h</div>
        <div class="mini-delta"><span class="delta {volDelta < 0 ? 'down' : 'up'}">{volDelta < 0 ? "▼" : "▲"} {Math.abs(volDelta)}% vs. Vorwoche</span></div>
      </div>
      <div class="mini-chart">{#key chartKey}<canvas use:chartjs={loadMiniCfg}></canvas>{/key}</div>
    </div>

    <div class="mini-card">
      <div class="mini-left">
        <div class="mini-label">Completion Rate</div>
        <div class="mini-value" style="color:var(--c-success)">{overview.pct}%</div>
        <div class="mini-delta"><span class="delta up">{overview.done}/{overview.planned} diese Woche</span></div>
      </div>
      <div class="mini-chart">{#key chartKey}<canvas use:chartjs={compCfg}></canvas>{/key}</div>
    </div>
  </div>

  <!-- Letzte Aktivitäten (Intervals.icu) -->
  {#if activities.length}
    <div class="card">
      <div class="act-head">
        <div>
          <div class="card-title">Letzte Aktivitäten</div>
          <div class="act-sub"><span class="iv-badge">↻ intervals.icu</span></div>
        </div>
        {#if onnav}<div class="card-action" onclick={() => onnav("stats")}>Alle Aktivitäten →</div>{/if}
      </div>
      {#each activities as a (a.key)}
        <div class="act-item" class:clickable={!!onnav} onclick={() => onnav?.("stats")}>
          <div class="act-icon" style="background:color-mix(in srgb, {a.color} 16%, transparent);color:{a.color}">{a.emoji}</div>
          <div class="act-main">
            <div class="session-name">{a.name}</div>
            <div class="session-meta">{a.dateLabel}{#if a.type} · {a.type}{/if}</div>
          </div>
          <div class="act-stats">
            {#if a.dist}<div class="act-stat"><div class="act-stat-v">{a.dist}</div>{#if a.dur}<div class="act-stat-l">{a.dur}</div>{/if}</div>{/if}
            {#if a.pace}<div class="act-stat"><div class="act-stat-v" style="color:var(--c-streak)">{a.pace}</div><div class="act-stat-l">Ø Pace</div></div>{/if}
            {#if a.hf}<div class="act-stat"><div class="act-stat-v" style="color:var(--red)">{a.hf}</div><div class="act-stat-l">Ø HF</div></div>{/if}
            {#if a.done}<span class="act-done">✓ Erledigt</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dash {
    --green: var(--c-success);
    --orange: var(--c-streak);
    --cyan: var(--c-cyan);
    --red: #ef4444;
    --surface: var(--card);
    --surface-2: var(--card-hover);
    --r: 10px;
    --r-sm: 7px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .row { display: grid; gap: 16px; }
  .row-main-side { grid-template-columns: 1fr 340px; }
  .row-3 { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 900px) {
    .row-main-side, .row-3 { grid-template-columns: 1fr; }
  }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .card-head { padding: 16px 20px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .card-title { font-size: 13px; font-weight: 700; color: var(--text); }
  .card-sub { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
  .card-action { font-size: 12px; color: var(--accent); font-weight: 600; cursor: pointer; white-space: nowrap; padding-top: 2px; }
  .card-action:hover { text-decoration: underline; }
  .big-num { font-size: 32px; font-weight: 800; line-height: 1; font-feature-settings: "tnum"; color: var(--text); }
  .delta { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; }
  .delta.up { color: var(--green); }
  .delta.down { color: var(--red); }
  .delta.warn { color: var(--orange); }
  .chart-wrap { padding: 16px 20px 20px; position: relative; }
  .card-foot { padding: 10px 20px 14px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .foot-label { font-size: 11px; color: var(--text-muted); }
  .foot-link { font-size: 11px; color: var(--accent); font-weight: 600; cursor: pointer; }

  .badge { background: rgba(59,130,246,0.15); color: var(--accent); font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; border: 1px solid rgba(59,130,246,0.3); text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }

  .tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 16px; margin-top: 12px; }
  .tab { padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.12s; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab:hover { color: var(--text); }

  .session-list { padding: 0 16px 16px; display: flex; flex-direction: column; }
  .session-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .session-item:last-child { border-bottom: none; }
  .session-icon { width: 36px; height: 36px; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
  .session-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .session-meta { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .min-w-0 { min-width: 0; }
  .stat-lbl { font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
  .stat-val { font-size: 14px; font-weight: 700; font-family: var(--mono); color: var(--text); }
  .rest-state { padding: 28px 16px 24px; text-align: center; }

  .start-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 700; font-family: var(--font); border: none; border-radius: var(--r-sm); padding: 11px 16px; width: calc(100% - 32px); margin: 0 16px 16px; cursor: pointer; box-shadow: 0 3px 16px rgba(59,130,246,0.35); transition: all 0.12s; }
  .start-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 5px 20px rgba(59,130,246,0.5); }

  .week-wrap { padding: 16px 20px 20px; }
  .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .day-cell { border-radius: var(--r-sm); padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border); }
  .day-cell.done { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.25); }
  .day-cell.today { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); box-shadow: 0 0 12px rgba(59,130,246,0.1); }
  .day-cell.rest { opacity: 0.45; }
  .day-lbl { font-size: 9px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .day-cell.today .day-lbl { color: var(--accent); }
  .day-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-dim); }
  .day-cell.done .day-dot { background: var(--green); }
  .day-cell.today .day-dot { background: var(--accent); box-shadow: 0 0 5px var(--accent); }
  .day-name { font-size: 10px; color: var(--text-dim); text-align: center; line-height: 1.2; }
  .day-cell.today .day-name { color: var(--accent); }
  .day-cell.done .day-name { color: var(--text-muted); }
  .prog-bar { height: 5px; background: var(--surface-3); border-radius: 999px; overflow: hidden; margin-top: 10px; }
  .prog-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--green), var(--accent)); }

  .mini-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
  .mini-left { flex: 1; min-width: 0; }
  .mini-label { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; }
  .mini-value { font-size: 26px; font-weight: 800; line-height: 1; font-feature-settings: "tnum"; }
  .mini-delta { margin-top: 4px; }
  .mini-chart { width: 100px; height: 52px; flex-shrink: 0; }

  /* recent activities feed */
  .act-head { padding: 14px 20px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .act-sub { margin-top: 5px; }
  .iv-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--c-cyan); background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); border-radius: 999px; padding: 2px 8px; }
  .act-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .act-item:last-child { border-bottom: none; }
  .act-item.clickable { cursor: pointer; }
  .act-item.clickable:hover { background: var(--card-hover); }
  .act-icon { width: 36px; height: 36px; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
  .act-main { flex: 1; min-width: 0; }
  .act-stats { display: flex; gap: 16px; align-items: center; flex-shrink: 0; }
  .act-stat { text-align: right; }
  .act-stat-v { font-size: 13px; font-weight: 700; color: var(--text); font-family: var(--mono); }
  .act-stat-l { font-size: 10px; color: var(--text-muted); }
  .act-done { display: inline-flex; align-items: center; gap: 5px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.2); border-radius: 999px; padding: 3px 10px; font-size: 10px; font-weight: 700; color: var(--c-success); white-space: nowrap; }
  @media (max-width: 720px) {
    .act-stats { gap: 10px; }
    .act-stat:not(:first-child), .act-done { display: none; }
  }
</style>
