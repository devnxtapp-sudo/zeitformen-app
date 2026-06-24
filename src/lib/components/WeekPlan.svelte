<script>
  import { parseYmd, todayKey, dayKeyOf } from "../dateutil.js";
  import { weeklyLoad, weekOverview } from "../stats.js";
  import { formatInterval } from "../seed.js";
  import Moon from "@lucide/svelte/icons/moon";

  let { goal, week = {}, today, editMode = false, selectedDay, onselect, onedit, onlog } = $props();

  const DAYS = [
    { key: "mo", short: "Mo" },
    { key: "di", short: "Di" },
    { key: "mi", short: "Mi" },
    { key: "do", short: "Do" },
    { key: "fr", short: "Fr" },
    { key: "sa", short: "Sa" },
    { key: "so", short: "So" },
  ];

  let todayK = $derived(today ?? todayKey());
  let todayDayKey = $derived(dayKeyOf(todayK));
  let overview = $derived(weekOverview(goal, week, todayK));
  let load = $derived(weeklyLoad(goal));

  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const n = (x.getUTCDay() + 6) % 7;
    x.setUTCDate(x.getUTCDate() - n + 3);
    const f = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((x - f) / 86400000 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  }
  let kw = $derived(week.mo ? isoWeek(parseYmd(week.mo)) : isoWeek(parseYmd(todayK)));

  function tint(hex, a) {
    const h = String(hex || "#64748b").replace("#", "");
    if (h.length < 6) return `rgba(100,116,139,${a})`;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function typeOf(id) {
    return (goal.types ?? []).find((t) => t.id === id) ?? null;
  }
  function dateNum(k) {
    return week[k] ? parseYmd(week[k]).getDate() : "";
  }
  function statusOf(k) {
    const d = goal.days[k];
    if (d.isRest) return "rest";
    if (goal.log?.[week[k]]) return "done";
    if (k === todayDayKey) return "today";
    return "upcoming";
  }
  function sessionsOf(k) {
    const d = goal.days[k];
    if (d.isRest) return [];
    const list = [{ typeId: d.typeId, title: d.title, meta: d.meta, session: d.session }];
    for (const ex of d.extraSessions ?? []) list.push({ typeId: ex.typeId, title: ex.title, meta: ex.meta, session: ex.session });
    return list;
  }

  // selected day detail
  let sel = $derived(selectedDay ?? todayDayKey);
  let selIndex = $derived(DAYS.findIndex((d) => d.key === sel));
  let selDay = $derived(goal.days[sel]);
  let selType = $derived(typeOf(selDay?.typeId));
  function kmOf(day) {
    let km = 0;
    for (const iv of day?.session?.intervals ?? []) {
      const n = (Number(iv.repeat) || 1) * (Number(iv.amount) || 0);
      if (/km/i.test(iv.amountUnit || "")) km += n;
      else if (/^m$/i.test(iv.amountUnit || "")) km += n / 1000;
    }
    return km > 0 ? `${Math.round(km * 10) / 10} km` : null;
  }
  let selStats = $derived.by(() => {
    if (!selDay || selDay.isRest) return [];
    const s = [];
    if (selDay.meta) s.push(["Dauer", selDay.meta]);
    const km = kmOf(selDay);
    if (km) s.push(["Distanz", km]);
    if (selDay.session?.intensity) s.push(["Intensität", selDay.session.intensity]);
    return s;
  });
  let selSteps = $derived.by(() => {
    if (!selDay || selDay.isRest) return [];
    const blocks = (selDay.session?.blocks ?? []).filter((b) => b.title?.trim() || b.items?.length);
    if (blocks.length) return blocks.map((b) => [b.title || "Block", (b.items ?? []).join(" · ")]);
    return (selDay.session?.intervals ?? []).map((iv) => [iv.name || "Übung", formatInterval(iv)]);
  });
  function fmtFull(k) {
    if (!week[k]) return "";
    return parseYmd(week[k]).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  }

  function clickDay(k) {
    if (goal.days[k].isRest && !editMode) return;
    if (editMode) onedit?.(k);
    else onselect?.(k);
  }
</script>

<div class="wp">
  <div class="page-header">
    <div>
      <div class="page-title">Wochenplan</div>
      <div class="page-sub">{goal.name} · KW {kw}</div>
    </div>
    <div class="week-nav-label">KW {kw}</div>
  </div>

  <div class="week-strip">
    <div class="strip-stat">
      <div class="strip-label">Einheiten</div>
      <div class="strip-value">{overview.done} / {overview.planned}</div>
      <div class="strip-sub">abgeschlossen</div>
    </div>
    <div class="strip-divider"></div>
    <div class="strip-stat">
      <div class="strip-label">Volumen</div>
      <div class="strip-value">{load.hours} h</div>
      <div class="strip-sub">diese Woche{#if load.estimated} · gesch.{/if}</div>
    </div>
    <div class="strip-divider"></div>
    <div class="strip-progress">
      <div class="strip-progress-header">
        <span class="strip-progress-label">Wochenfortschritt</span>
        <span class="strip-progress-pct">{overview.pct}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:{overview.pct}%"></div></div>
    </div>
  </div>

  <div class="planner">
    <div class="days-grid">
        {#each DAYS as d (d.key)}
          {@const st = statusOf(d.key)}
          {@const sessions = sessionsOf(d.key)}
          <div class="day-col" class:today={st === "today"} class:done={st === "done"} class:rest={st === "rest"} class:sel={sel === d.key} onclick={() => clickDay(d.key)} role="button" tabindex="0">
            <div class="day-col-header">
              <div class="day-col-label">{d.short}</div>
              <div class="day-col-date">{dateNum(d.key)}</div>
              <span class="day-col-status status-{st}">
                {st === "done" ? "✓ Erledigt" : st === "today" ? "● Heute" : st === "rest" ? "Ruhetag" : "Ausstehend"}
              </span>
            </div>
            <div class="day-col-body">
              {#if st === "rest"}
                <div class="session-block rest-block">
                  <Moon size={20} class="rest-ic" />
                  <div class="sb-title" style="color:var(--text-dim);font-size:11px;margin-top:6px">Ruhetag</div>
                  <div class="sb-meta" style="margin-top:3px">Erholung</div>
                </div>
              {:else}
                {#each sessions as s (s.title + s.typeId)}
                  {@const t = typeOf(s.typeId)}
                  {@const c = t?.color ?? "#64748b"}
                  <div class="session-block" style="background:{tint(c, 0.1)};">
                    <div class="sb-type" style="color:{c}">{t?.label ?? "Training"}</div>
                    <div class="sb-title">{s.title || "Training"}</div>
                    {#if s.meta}<div class="sb-meta">{s.meta}</div>{/if}
                  </div>
                {/each}
                {#if st === "done"}
                  <div class="done-check"><span class="done-check-icon">✓</span>Abgeschlossen</div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>

    {#if selIndex >= 0}
      <div class="connector"><div class="caret" style="grid-column: {selIndex + 1}"></div></div>
    {/if}

    <div class="detail-panel">
      {#if !selDay || selDay.isRest}
        <div class="dp-header"><div class="dp-title">{selDay?.isRest ? "Ruhetag" : "Kein Tag gewählt"}</div><div class="dp-sub">{fmtFull(sel)}</div></div>
        <div class="dp-rest"><Moon size={15} /> Erholung ist Teil des Plans.</div>
      {:else}
        <div class="dp-header" style="background:linear-gradient(135deg, {tint(selType?.color ?? '#3b82f6', 0.1)}, transparent)">
          <span class="dp-badge" style="background:{tint(selType?.color ?? '#3b82f6', 0.15)};color:{selType?.color ?? '#3b82f6'}">{selType?.label ?? "Training"}</span>
          <div class="dp-title">{selDay.title || "Training"}</div>
          <div class="dp-sub">{fmtFull(sel)}</div>
        </div>
        {#if selStats.length}
          <div class="dp-stats">
            {#each selStats as [l, v] (l)}
              <div class="dp-stat"><div class="dp-stat-label">{l}</div><div class="dp-stat-value">{v}</div></div>
            {/each}
          </div>
        {/if}
        {#if selSteps.length}
          <div class="dp-blocks">
            <div class="dp-block-label">Session-Aufbau</div>
            {#each selSteps as [name, detail], i (i)}
              <div class="dp-block-item"><div class="dp-block-num">{i + 1}</div><div class="dp-block-name">{name}</div>{#if detail}<div class="dp-block-detail">{detail}</div>{/if}</div>
            {/each}
          </div>
        {/if}
        {#if editMode}
          <button class="dp-start-btn" onclick={() => onedit?.(sel)}>Tag bearbeiten</button>
        {:else if onlog}
          <button class="dp-start-btn" onclick={() => onlog(week[sel], sel)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Workout starten
          </button>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .wp { --green: var(--c-success); --r: 10px; --r-sm: 7px; display: flex; flex-direction: column; gap: 16px; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .page-title { font-size: 20px; font-weight: 800; color: var(--text); }
  .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
  .week-nav-label { font-size: 13px; font-weight: 700; color: var(--text); padding: 6px 12px; border-radius: var(--r-sm); background: var(--card); border: 1px solid var(--border); }

  .week-strip { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 16px 20px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .strip-stat { display: flex; flex-direction: column; gap: 2px; }
  .strip-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
  .strip-value { font-size: 18px; font-weight: 800; color: var(--text); font-family: var(--mono); }
  .strip-sub { font-size: 11px; color: var(--text-muted); }
  .strip-divider { width: 1px; height: 36px; background: var(--border); }
  .strip-progress { flex: 1; min-width: 160px; }
  .strip-progress-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .strip-progress-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .strip-progress-pct { font-size: 12px; font-weight: 700; color: var(--green); font-family: var(--mono); }
  .prog-bar { height: 5px; background: var(--surface-3); border-radius: 999px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--green), var(--accent)); }

  .planner { display: flex; flex-direction: column; }
  .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
  .connector { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-top: 8px; margin-bottom: -1px; position: relative; z-index: 1; }
  .caret { justify-self: center; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid var(--accent); filter: drop-shadow(0 -2px 6px rgba(var(--accent-rgb), 0.25)); }
  @media (max-width: 1100px) { .days-grid { grid-template-columns: repeat(4, 1fr); } .connector { display: none; } }
  @media (max-width: 700px) { .days-grid { grid-template-columns: repeat(2, 1fr); } }

  .day-col { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: border-color 0.12s, box-shadow 0.12s; }
  .day-col:hover { border-color: var(--border-strong); }
  .day-col.today { border-color: rgba(var(--accent-rgb), 0.45); box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.1); }
  .day-col.done { border-color: rgba(34, 197, 94, 0.25); }
  .day-col.rest { opacity: 0.55; cursor: default; }
  .day-col.sel { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .day-col-header { padding: 12px 10px 10px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .day-col.today .day-col-header { background: rgba(var(--accent-rgb), 0.15); }
  .day-col.done .day-col-header { background: rgba(34, 197, 94, 0.12); }
  .day-col-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .day-col.today .day-col-label { color: var(--accent); }
  .day-col.done .day-col-label { color: var(--green); }
  .day-col-date { font-size: 20px; font-weight: 800; color: var(--text); line-height: 1; }
  .day-col.today .day-col-date { color: var(--accent); }
  .day-col-status { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 999px; }
  .status-done { background: rgba(34, 197, 94, 0.12); color: var(--green); }
  .status-today { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); }
  .status-upcoming, .status-rest { background: var(--surface-3); color: var(--text-dim); }

  .day-col-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .session-block { border-radius: var(--r-sm); padding: 10px; display: flex; flex-direction: column; gap: 5px; border: 1px solid transparent; }
  .rest-block { text-align: center; padding: 16px 8px; background: var(--surface-3); display: flex; flex-direction: column; align-items: center; }
  .rest-block :global(.rest-ic) { color: var(--text-dim); }
  .sb-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
  .sb-title { font-size: 12px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .sb-meta { font-size: 10px; color: var(--text-muted); }
  .done-check { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; color: var(--green); margin-top: auto; }
  .done-check-icon { width: 14px; height: 14px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }

  .detail-panel { width: 100%; background: var(--card); border: 1px solid var(--border); border-top: 2px solid var(--accent); border-radius: var(--r); overflow: hidden; }
  .dp-header { padding: 16px; border-bottom: 1px solid var(--border); }
  .dp-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 3px 9px; border-radius: 999px; display: inline-block; margin-bottom: 8px; }
  .dp-title { font-size: 18px; font-weight: 800; color: var(--text); }
  .dp-sub { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .dp-rest { padding: 28px 16px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); font-size: 13px; }
  .dp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }
  .dp-stat { background: var(--card); padding: 12px 14px; }
  .dp-stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
  .dp-stat-value { font-size: 15px; font-weight: 800; color: var(--text); font-family: var(--mono); margin-top: 2px; }
  .dp-blocks { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  .dp-block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 2px; }
  .dp-block-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: var(--surface-2); border-radius: var(--r-sm); border: 1px solid var(--border); }
  .dp-block-num { width: 20px; height: 20px; border-radius: 50%; background: var(--surface-3); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-muted); font-family: var(--mono); flex-shrink: 0; }
  .dp-block-name { font-size: 12px; font-weight: 600; color: var(--text); flex: 1; min-width: 0; }
  .dp-block-detail { font-size: 11px; color: var(--text-muted); font-family: var(--mono); text-align: right; }
  .dp-start-btn { margin: 14px auto 16px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 700; font-family: var(--font); border: none; border-radius: var(--r-sm); padding: 12px; width: min(360px, calc(100% - 32px)); cursor: pointer; box-shadow: 0 3px 16px rgba(var(--accent-rgb), 0.3); transition: all 0.12s; }
  .dp-start-btn:hover { background: var(--accent-strong); transform: translateY(-1px); }
</style>
