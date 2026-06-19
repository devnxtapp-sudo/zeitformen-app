<script>
  import { DAY_KEYS } from "../seed.js";

  let { goal, week = {} } = $props();

  // planned sessions this week = non-rest days
  let planned = $derived(
    DAY_KEYS.filter((k) => !goal.days[k].isRest).length,
  );

  // completed this week = logged dates that fall on a non-rest weekday
  let doneThisWeek = $derived(
    DAY_KEYS.filter((k) => !goal.days[k].isRest && goal.log?.[week[k]]).length,
  );

  let pct = $derived(planned ? Math.round((doneThisWeek / planned) * 100) : 0);
</script>

<div class="mb-[18px] flex items-center gap-5 rounded-xl border border-line bg-card px-[18px] py-4">
  <div class="min-w-0 flex-auto">
    <div class="mb-2.5 flex items-baseline gap-2.5">
      <span class="text-xl font-bold text-ink"
        >{doneThisWeek}<span class="font-semibold text-ink-dim">/{planned}</span></span
      >
      <span class="text-sm text-ink-muted">Einheiten diese Woche</span>
    </div>
    <div class="h-2 overflow-hidden rounded-full border border-line bg-surface">
      <div
        class="h-full rounded-full bg-zone2 transition-[width] duration-300 ease-out"
        style="width: {pct}%"
      ></div>
    </div>
  </div>
</div>
