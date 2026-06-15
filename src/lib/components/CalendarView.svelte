<script>
  import { monthGrid, MONTH_NAMES, todayKey } from "../dateutil.js";
  import { logEntry } from "../store.svelte.js";

  let { goal, onopen } = $props();

  const now = new Date();
  let year = $state(now.getFullYear());
  let month = $state(now.getMonth()); // 0-based

  const today = todayKey();
  const DOW = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

  let weeks = $derived(monthGrid(year, month));

  // count of completed sessions in the visible month
  let monthCount = $derived(
    weeks
      .flat()
      .filter((c) => !c.outside && logEntry(goal, c.date)).length,
  );

  function prev() {
    if (month === 0) {
      month = 11;
      year -= 1;
    } else {
      month -= 1;
    }
  }
  function next() {
    if (month === 11) {
      month = 0;
      year += 1;
    } else {
      month += 1;
    }
  }
  function goToday() {
    year = now.getFullYear();
    month = now.getMonth();
  }
</script>

<div class="calendar">
  <div class="cal-head">
    <div class="nav">
      <button class="btn btn-sm btn-ghost" onclick={prev} aria-label="Vorheriger Monat">‹</button>
      <span class="month-name">{MONTH_NAMES[month]} {year}</span>
      <button class="btn btn-sm btn-ghost" onclick={next} aria-label="Nächster Monat">›</button>
    </div>
    <div class="cal-meta">
      <span class="count">{monthCount} Einheiten</span>
      <button class="btn btn-sm" onclick={goToday}>Heute</button>
    </div>
  </div>

  <div class="dow-row">
    {#each DOW as d (d)}<span class="dow">{d}</span>{/each}
  </div>

  <div class="month-grid">
    {#each weeks as wk, wi (wi)}
      {#each wk as cell (cell.date)}
        {@const entry = logEntry(goal, cell.date)}
        <button
          class="cell"
          class:outside={cell.outside}
          class:today={cell.date === today}
          class:done={!!entry}
          onclick={() => onopen?.(cell.date, entry?.dayKey)}
          title={entry ? entry.title || entry.typeLabel : ""}
        >
          <span class="dnum">{cell.day}</span>
          {#if entry}
            <span class="dot" style="background: {entry.typeColor}"></span>
          {/if}
        </button>
      {/each}
    {/each}
  </div>
</div>

<style>
  .calendar {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px 20px;
    margin-bottom: 22px;
  }
  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .month-name {
    font-size: 17px;
    font-weight: 700;
    min-width: 150px;
    text-align: center;
  }
  .cal-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .count {
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .dow-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 6px;
  }
  .dow {
    text-align: center;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .cell {
    aspect-ratio: 1 / 1;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-elev);
    color: var(--text);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: pointer;
    transition: border-color 0.13s, background 0.13s;
    position: relative;
  }
  .cell:hover {
    border-color: var(--border-strong);
    background: var(--card-hover);
  }
  .cell.outside {
    opacity: 0.35;
  }
  .cell.today {
    border-color: var(--accent);
  }
  .cell.done {
    background: rgba(95, 184, 122, 0.1);
    border-color: rgba(95, 184, 122, 0.45);
  }
  .dnum {
    font-size: 13px;
    font-weight: 600;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
  }
  @media (max-width: 480px) {
    .calendar {
      padding: 12px 10px 16px;
    }
    .month-grid,
    .dow-row {
      gap: 4px;
    }
    .dnum {
      font-size: 12px;
    }
  }
</style>
