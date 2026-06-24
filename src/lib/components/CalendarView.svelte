<script>
  import { monthGrid, MONTH_NAMES, todayKey, dayKeyOf, weekDates, parseYmd, ymd } from "../dateutil.js";
  import { logEntry, typeById } from "../store.svelte.js";
  import Calendar from "@lucide/svelte/icons/calendar";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import List from "@lucide/svelte/icons/list";
  import Plus from "@lucide/svelte/icons/plus";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Moon from "@lucide/svelte/icons/moon";
  import Check from "@lucide/svelte/icons/check";
  import CalendarOff from "@lucide/svelte/icons/calendar-off";
  import Star from "@lucide/svelte/icons/star";

  let { goal, onopen } = $props();

  const now = new Date();
  let year = $state(now.getFullYear());
  let month = $state(now.getMonth()); // 0-based
  let view = $state("month"); // month | week | list
  let selected = $state(todayKey());

  const today = todayKey();
  const DOW = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
  const DOW_KEYS = ["mo", "di", "mi", "do", "fr", "sa", "so"];
  const SHORT = { mo: "Mo", di: "Di", mi: "Mi", do: "Do", fr: "Fr", sa: "Sa", so: "So" };
  const FULL = { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" };
  const ABBR = MONTH_NAMES.map((m) => m.slice(0, 3).toUpperCase());

  let weeks = $derived(monthGrid(year, month));

  function plannedFor(date) {
    const day = goal?.days?.[dayKeyOf(date)];
    if (!day) return null;
    const type = typeById(goal, day.typeId);
    return {
      isRest: !!day.isRest,
      title: day.title || "Training",
      meta: day.meta || "",
      label: type?.label || null,
      color: type?.color || "var(--text-dim)",
      extras: (day.extraSessions || []).length,
    };
  }

  function shift(date, n) {
    const d = parseYmd(date);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function selectCell(cell) {
    selected = cell.date;
    if (cell.outside) {
      const d = parseYmd(cell.date);
      month = d.getMonth();
      year = d.getFullYear();
    }
  }
  function prev() {
    if (view === "week") {
      selected = shift(selected, -7);
    } else if (month === 0) {
      month = 11; year -= 1;
    } else month -= 1;
  }
  function next() {
    if (view === "week") {
      selected = shift(selected, 7);
    } else if (month === 11) {
      month = 0; year += 1;
    } else month += 1;
  }
  function openSelected() {
    onopen?.(selected, dayKeyOf(selected));
  }

  let selPlan = $derived(plannedFor(selected));
  let selLog = $derived(logEntry(goal, selected));
  let selDate = $derived(parseYmd(selected));

  let weekCells = $derived.by(() => {
    const wd = weekDates(parseYmd(selected));
    return DOW_KEYS.map((k) => ({ dayKey: k, date: wd[k] }));
  });

  let listItems = $derived.by(() => {
    const out = [];
    for (let i = 0; i < 42 && out.length < 24; i++) {
      const date = shift(today, i);
      const p = plannedFor(date);
      if (p && !p.isRest) out.push({ date, ...p, weekday: FULL[dayKeyOf(date)] });
    }
    return out;
  });

  let navTitle = $derived.by(() => {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "week") {
      const a = parseYmd(weekCells[0].date), b = parseYmd(weekCells[6].date);
      return `${a.getDate()}. ${ABBR[a.getMonth()]} – ${b.getDate()}. ${ABBR[b.getMonth()]}`;
    }
    return "Kommende Einheiten";
  });

  let events = $derived.by(() => {
    const out = [];
    if (goal?.targetDate) {
      const d = parseYmd(goal.targetDate);
      const days = Math.round((d - parseYmd(today)) / 86400000);
      out.push({
        date: goal.targetDate,
        name: goal.name || "Wettkampf",
        sub: goal.category || goal.sport || "Zieltermin",
        days,
      });
    }
    return out;
  });

  let legend = $derived([
    ...(goal?.types || []).map((t) => ({ label: t.label, color: t.color })),
    { label: "Ruhetag", color: "var(--text-dim)" },
  ]);
</script>

<div class="cal">
  <div class="cal-head">
    <div>
      <h1 class="cal-h1">Kalender</h1>
      <div class="cal-sub">{goal?.name ?? "Plan"} · {MONTH_NAMES[month]} {year}</div>
    </div>
    <div class="cal-tools">
      <div class="seg">
        <button class="seg-b" class:active={view === "month"} onclick={() => (view = "month")}><Calendar size={14} /> Monat</button>
        <button class="seg-b" class:active={view === "week"} onclick={() => (view = "week")}><CalendarDays size={14} /> Woche</button>
        <button class="seg-b" class:active={view === "list"} onclick={() => (view = "list")}><List size={14} /> Liste</button>
      </div>
      <button class="add-btn" onclick={openSelected}><Plus size={15} /> Training eintragen</button>
    </div>
  </div>

  <div class="cal-main">
    <div class="cal-card">
      {#if view !== "list"}
        <div class="cal-nav">
          <button class="nav-b" onclick={prev} aria-label="Zurück"><ChevronLeft size={18} /></button>
          <span class="nav-title">{navTitle}</span>
          <button class="nav-b" onclick={next} aria-label="Weiter"><ChevronRight size={18} /></button>
        </div>
      {:else}
        <div class="cal-nav"><span class="nav-title">{navTitle}</span></div>
      {/if}

      {#if view === "month"}
        <div class="dow">{#each DOW as d (d)}<span>{d}</span>{/each}</div>
        <div class="grid">
          {#each weeks as wk, wi (wi)}
            {#each wk as cell (cell.date)}
              {@const plan = plannedFor(cell.date)}
              {@const log = logEntry(goal, cell.date)}
              <button class="cell" class:outside={cell.outside} class:today={cell.date === today} class:sel={cell.date === selected} onclick={() => selectCell(cell)}>
                <span class="cell-day">{cell.day}</span>
                {#if log}<span class="cell-done"><Check size={10} /></span>{/if}
                {#if plan && !plan.isRest}
                  <span class="cell-ev">
                    <span class="cell-bar" style="background:{plan.color}"></span>
                    <span class="cell-label" style="color:{plan.color}">{plan.title}</span>
                  </span>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      {:else if view === "week"}
        <div class="week-list">
          {#each weekCells as wc (wc.date)}
            {@const plan = plannedFor(wc.date)}
            {@const log = logEntry(goal, wc.date)}
            <button class="week-row" class:today={wc.date === today} class:sel={wc.date === selected} onclick={() => (selected = wc.date)}>
              <div class="wk-date"><span class="wk-dow">{SHORT[wc.dayKey]}</span><span class="wk-num">{parseYmd(wc.date).getDate()}</span></div>
              {#if plan && !plan.isRest}
                <span class="wk-bar" style="background:{plan.color}"></span>
                <div class="wk-tx"><div class="wk-title">{plan.title}</div><div class="wk-meta">{plan.label ?? ""}{plan.meta ? (plan.label ? " · " : "") + plan.meta : ""}</div></div>
              {:else}
                <div class="wk-rest"><Moon size={13} /> Ruhetag</div>
              {/if}
              {#if log}<span class="wk-done"><Check size={13} /></span>{/if}
            </button>
          {/each}
        </div>
      {:else}
        {#if listItems.length}
          <div class="agenda">
            {#each listItems as it (it.date)}
              <button class="ag-row" class:today={it.date === today} onclick={() => (selected = it.date)}>
                <div class="ag-date"><span class="ag-d">{parseYmd(it.date).getDate()}</span><span class="ag-m">{ABBR[parseYmd(it.date).getMonth()]}</span></div>
                <span class="ag-bar" style="background:{it.color}"></span>
                <div class="ag-tx"><div class="ag-title">{it.title}</div><div class="ag-meta">{it.weekday}{it.label ? " · " + it.label : ""}</div></div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="card-empty">Keine geplanten Einheiten in den nächsten Wochen.</div>
        {/if}
      {/if}
    </div>
  </div>

  <aside class="cal-side">
    <div class="side-card">
      <div class="sd-top">
        <div>
          <div class="sd-num">{selDate.getDate()}</div>
          <div class="sd-date">{FULL[dayKeyOf(selected)]}, {selDate.getDate()}. {MONTH_NAMES[selDate.getMonth()]} {selDate.getFullYear()}</div>
        </div>
        <button class="sd-add" onclick={openSelected}><Plus size={14} /> Hinzufügen</button>
      </div>

      {#if selPlan && !selPlan.isRest}
        <button class="sd-session" onclick={openSelected}>
          <span class="sd-bar" style="background:{selPlan.color}"></span>
          <span class="sd-s-tx">
            <span class="sd-s-title">{selPlan.title}</span>
            {#if selPlan.label}<span class="sd-s-type" style="color:{selPlan.color}">{selPlan.label}</span>{/if}
            {#if selPlan.meta}<span class="sd-s-meta">{selPlan.meta}</span>{/if}
          </span>
        </button>
        {#if selPlan.extras}<div class="sd-extra">+{selPlan.extras} weitere Einheit{selPlan.extras > 1 ? "en" : ""}</div>{/if}
      {:else}
        <div class="sd-empty">
          <CalendarOff size={26} />
          <div class="sd-empty-t">Kein Training geplant</div>
          <div class="sd-empty-s">{selPlan?.isRest ? "Ruhetag — Erholung ist Teil des Plans" : "Ruhetag oder Training eintragen"}</div>
        </div>
      {/if}

      {#if selLog}<div class="sd-logged"><Check size={13} /> Erledigt{selLog.note ? " · " + selLog.note : ""}</div>{/if}
    </div>

    <div class="side-card">
      <div class="side-h">Wettkämpfe &amp; Ziele</div>
      {#if events.length}
        {#each events as ev (ev.date)}
          <div class="ev-row">
            <div class="ev-date"><span class="ev-d">{parseYmd(ev.date).getDate()}</span><span class="ev-m">{ABBR[parseYmd(ev.date).getMonth()]}</span></div>
            <div class="ev-tx"><div class="ev-name">{ev.name}</div><div class="ev-sub">{ev.sub}</div></div>
            <div class="ev-meta">
              <span class="ev-badge"><Star size={10} /> Ziel</span>
              <span class="ev-days">{ev.days >= 0 ? ev.days + " Tage" : "vorbei"}</span>
            </div>
          </div>
        {/each}
      {:else}
        <div class="side-empty">Kein Zieldatum gesetzt.</div>
      {/if}
    </div>

    <div class="side-card">
      <div class="side-h sm">Legende</div>
      <div class="legend">
        {#each legend as l (l.label)}
          <span class="lg"><span class="lg-dot" style="background:{l.color}"></span>{l.label}</span>
        {/each}
      </div>
    </div>
  </aside>
</div>

<style>
  .cal {
    --surface: var(--card);
    --border-md: var(--border-strong);
    --text-faint: var(--text-dim);
    --r: 12px;
    --r-sm: 8px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 20px;
    align-items: start;
  }
  .cal-head { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .cal-h1 { font-size: 22px; font-weight: 800; color: var(--text); }
  .cal-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
  .cal-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

  .seg { display: flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 4px; }
  .seg-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: none; background: none; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; font-family: var(--font); }
  .seg-b.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); }
  .add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: none; border-radius: var(--r-sm); background: var(--accent); color: var(--on-accent); font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--font); box-shadow: 0 3px 14px rgba(var(--accent-rgb), 0.3); }
  .add-btn:hover { background: var(--accent-strong); }

  .cal-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px 18px; }
  .cal-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 14px; position: relative; }
  .nav-b { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--surface-2); border-radius: var(--r-sm); color: var(--text-muted); cursor: pointer; }
  .nav-b:hover { color: var(--text); border-color: var(--border-md); }
  .nav-title { font-size: 16px; font-weight: 700; color: var(--text); min-width: 160px; text-align: center; }

  .dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; }
  .dow span { text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-faint); }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .cell {
    position: relative; display: flex; flex-direction: column; gap: 4px; min-height: 80px;
    padding: 7px; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: var(--surface-2); text-align: left; cursor: pointer; font-family: var(--font);
    transition: border-color 0.12s, background 0.12s;
  }
  .cell:hover { border-color: var(--border-md); }
  .cell.outside { opacity: 0.4; }
  .cell.sel { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.08); }
  .cell-day { font-size: 12px; font-weight: 600; color: var(--text-muted); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
  .cell.today .cell-day { background: var(--accent); color: var(--on-accent); border-radius: 999px; font-weight: 700; }
  .cell-done { position: absolute; top: 8px; right: 8px; color: var(--c-success); }
  .cell-ev { display: flex; flex-direction: column; gap: 3px; margin-top: auto; min-width: 0; }
  .cell-bar { height: 3px; width: 22px; border-radius: 2px; }
  .cell-label { font-size: 11px; font-weight: 600; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }

  .week-list { display: flex; flex-direction: column; gap: 8px; }
  .week-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface-2); cursor: pointer; text-align: left; font-family: var(--font); }
  .week-row:hover { border-color: var(--border-md); }
  .week-row.sel { border-color: var(--accent); }
  .wk-date { display: flex; flex-direction: column; align-items: center; width: 38px; flex: none; }
  .wk-dow { font-size: 10px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; }
  .wk-num { font-size: 17px; font-weight: 800; color: var(--text); }
  .week-row.today .wk-num { color: var(--accent); }
  .wk-bar { width: 4px; align-self: stretch; border-radius: 99px; flex: none; }
  .wk-tx { flex: 1; min-width: 0; }
  .wk-title { font-size: 13px; font-weight: 700; color: var(--text); }
  .wk-meta { font-size: 11px; color: var(--text-muted); }
  .wk-rest { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-faint); flex: 1; }
  .wk-done { color: var(--c-success); flex: none; }

  .agenda { display: flex; flex-direction: column; gap: 6px; }
  .ag-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface-2); cursor: pointer; text-align: left; font-family: var(--font); }
  .ag-row:hover { border-color: var(--border-md); }
  .ag-row.today { border-color: var(--accent); }
  .ag-date { display: flex; flex-direction: column; align-items: center; width: 40px; flex: none; }
  .ag-d { font-size: 17px; font-weight: 800; color: var(--text); }
  .ag-m { font-size: 9px; font-weight: 700; color: var(--text-faint); }
  .ag-bar { width: 4px; align-self: stretch; border-radius: 99px; flex: none; }
  .ag-tx { min-width: 0; }
  .ag-title { font-size: 13px; font-weight: 700; color: var(--text); }
  .ag-meta { font-size: 11px; color: var(--text-muted); }
  .card-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--text-muted); }

  .cal-side { display: flex; flex-direction: column; gap: 16px; }
  .side-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
  .sd-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .sd-num { font-size: 34px; font-weight: 800; line-height: 1; color: var(--text); }
  .sd-date { font-size: 12px; color: var(--text-muted); margin-top: 5px; }
  .sd-add { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border: none; border-radius: var(--r-sm); background: var(--accent); color: var(--on-accent); font-size: 12px; font-weight: 700; cursor: pointer; font-family: var(--font); flex: none; }
  .sd-add:hover { background: var(--accent-strong); }
  .sd-session { display: flex; gap: 11px; width: 100%; margin-top: 14px; padding: 12px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface-2); cursor: pointer; text-align: left; font-family: var(--font); }
  .sd-session:hover { border-color: var(--border-md); }
  .sd-bar { width: 4px; align-self: stretch; border-radius: 99px; flex: none; }
  .sd-s-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sd-s-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .sd-s-type { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .sd-s-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .sd-extra { margin-top: 8px; font-size: 11px; color: var(--text-muted); }
  .sd-empty { margin-top: 16px; padding: 22px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1px dashed var(--border-md); border-radius: var(--r-sm); color: var(--text-faint); text-align: center; }
  .sd-empty-t { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .sd-empty-s { font-size: 11px; color: var(--text-faint); }
  .sd-logged { margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--c-success); }

  .side-h { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
  .side-h.sm { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-faint); }
  .side-empty { font-size: 12px; color: var(--text-muted); }
  .ev-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .ev-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ev-date { display: flex; flex-direction: column; align-items: center; width: 40px; flex: none; }
  .ev-d { font-size: 18px; font-weight: 800; color: var(--text); }
  .ev-m { font-size: 9px; font-weight: 700; color: var(--text-faint); }
  .ev-tx { flex: 1; min-width: 0; }
  .ev-name { font-size: 13px; font-weight: 700; color: var(--text); }
  .ev-sub { font-size: 11px; color: var(--text-muted); }
  .ev-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
  .ev-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--accent); background: rgba(var(--accent-rgb), 0.15); }
  .ev-days { font-size: 11px; font-weight: 600; color: var(--text-muted); }

  .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
  .lg { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-muted); }
  .lg-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }

  @media (max-width: 1000px) {
    .cal { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    .cell { min-height: 64px; padding: 5px; }
    .cell-label { font-size: 10px; }
    .grid, .dow { gap: 4px; }
  }
</style>
