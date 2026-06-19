<script>
  import { Button } from "flowbite-svelte";
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

<div class="mb-[22px] rounded-xl border border-line bg-card p-4 max-[480px]:px-2.5 max-[480px]:pt-3 max-[480px]:pb-4 sm:px-[18px] sm:pt-4 sm:pb-5">
  <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <Button color="alternative" size="sm" class="!px-2.5" onclick={prev} aria-label="Vorheriger Monat">‹</Button>
      <span class="min-w-[150px] text-center text-lg font-bold">{MONTH_NAMES[month]} {year}</span>
      <Button color="alternative" size="sm" class="!px-2.5" onclick={next} aria-label="Nächster Monat">›</Button>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-ink-muted">{monthCount} Einheiten</span>
      <Button color="alternative" size="sm" onclick={goToday}>Heute</Button>
    </div>
  </div>

  <div class="mb-1.5 grid grid-cols-7 gap-1.5 max-[480px]:gap-1">
    {#each DOW as d (d)}<span class="text-center text-xs font-bold tracking-wider text-ink-dim">{d}</span>{/each}
  </div>

  <div class="grid grid-cols-7 gap-1.5 max-[480px]:gap-1">
    {#each weeks as wk, wi (wi)}
      {#each wk as cell (cell.date)}
        {@const entry = logEntry(goal, cell.date)}
        <button
          class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-[5px] rounded-lg border bg-surface-elev text-ink transition-colors duration-150 hover:border-line-strong hover:bg-card-hover
            {cell.outside ? 'opacity-35' : ''}
            {cell.date === today ? 'border-primary-500' : 'border-line'}
            {entry ? 'border-primary-500/45 bg-primary-500/10' : ''}"
          onclick={() => onopen?.(cell.date, entry?.dayKey)}
          title={entry ? entry.title || entry.typeLabel : ""}
        >
          <span class="text-[13px] font-semibold max-[480px]:text-xs">{cell.day}</span>
          {#if entry}
            <span class="h-[7px] w-[7px] rounded-full" style="background: {entry.typeColor}"></span>
          {/if}
        </button>
      {/each}
    {/each}
  </div>
</div>
