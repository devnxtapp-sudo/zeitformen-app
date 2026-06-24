<script>
  import { state as store } from "../store.svelte.js";
  import {
    setNutritionTargets,
    addMeal,
    updateMeal,
    deleteMeal,
  } from "../store.svelte.js";
  import { parseYmd, todayKey } from "../dateutil.js";
  import { Button, Input, Label } from "flowbite-svelte";

  let { onback } = $props();

  // selected day for the meal log (defaults to today)
  let date = $state(todayKey());

  const MACROS = [
    { id: "kcal", label: "Kalorien", short: "kcal", unit: "kcal" },
    { id: "protein", label: "Protein", short: "Protein", unit: "g" },
    { id: "carbs", label: "Kohlenhydrate", short: "KH", unit: "g" },
    { id: "fat", label: "Fett", short: "Fett", unit: "g" },
  ];

  let targets = $derived(store.nutrition.targets);
  let meals = $derived(store.nutrition.days?.[date]?.meals ?? []);

  // running totals for the selected day
  let totals = $derived.by(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const m of meals) {
      for (const k of Object.keys(t)) {
        const v = Number(m[k]);
        if (!Number.isNaN(v)) t[k] += v;
      }
    }
    return t;
  });

  function pct(have, goal) {
    const g = Number(goal);
    if (!g) return 0;
    return Math.min(100, Math.round((have / g) * 100));
  }

  function longDate(d) {
    return parseYmd(d).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
</script>

<div class="mb-[22px] flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3">
    <div class="flex items-center gap-2">
      <div>
        <h2 class="text-[22px] text-ink" style="font-weight:800">Ernährungsplan</h2>
        <span class="mt-0.5 block text-xs text-ink-muted">Makro-Ziele &amp; Tagesplan</span>
      </div>
    </div>
  </div>

  <section class="rounded-xl border border-line bg-card p-[18px]">
    <h3 class="mb-3.5 text-[15px] font-semibold">Tagesziele</h3>
    <div class="grid grid-cols-2 gap-3">
      {#each MACROS as m (m.id)}
        <div>
          <Label
            for="nt-target-{m.id}"
            class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            {m.label}
          </Label>
          <Input
            id="nt-target-{m.id}"
            type="number"
            inputmode="decimal"
            min="0"
            placeholder="–"
            class="font-semibold"
            value={targets[m.id] ?? ""}
            oninput={(e) => setNutritionTargets({ [m.id]: e.target.value })}
          >
            {#snippet right()}
              <span class="text-[11px] text-ink-dim">{m.unit}</span>
            {/snippet}
          </Input>
        </div>
      {/each}
    </div>
  </section>

  <section class="rounded-xl border border-line bg-card p-[18px]">
    <div class="mb-1 flex items-center justify-between gap-2.5">
      <h3 class="text-[15px] font-semibold">Tagesplan</h3>
      <Input
        type="date"
        class="w-auto"
        size="sm"
        value={date}
        oninput={(e) => (date = e.target.value)}
      />
    </div>
    <span class="mb-3.5 block text-xs capitalize text-ink-muted">{longDate(date)}</span>

    <div class="mb-4 grid grid-cols-2 gap-3">
      {#each MACROS as m (m.id)}
        <div>
          <div class="mb-1.5 flex items-baseline justify-between">
            <span class="text-[11px] uppercase tracking-wide text-ink-muted">{m.short}</span>
            <span class="text-sm font-bold">
              {totals[m.id]}{#if targets[m.id]}<span class="font-medium text-ink-dim"> / {targets[m.id]}</span>{/if}
            </span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              class="h-full rounded-full bg-zone2 transition-[width] duration-200"
              style="width: {pct(totals[m.id], targets[m.id])}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="flex flex-col gap-2.5">
      {#each meals as meal (meal.id)}
        <div class="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3">
          <div class="flex items-center gap-2">
            <input
              class="min-w-0 flex-1 border-0 border-b border-line bg-transparent py-1 text-[15px] font-semibold text-ink outline-none focus:border-zone2"
              type="text"
              placeholder="Mahlzeit"
              value={meal.name}
              oninput={(e) => updateMeal(date, meal.id, { name: e.target.value })}
            />
            <Button
              color="alternative"
              class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-line bg-surface-elev !p-0 text-lg leading-none text-ink-muted hover:border-rest hover:text-rest"
              onclick={() => deleteMeal(date, meal.id)}
              aria-label="Mahlzeit löschen"
            >×</Button>
          </div>
          <div class="grid grid-cols-4 gap-2">
            {#each MACROS as m (m.id)}
              <label class="flex flex-col gap-0.5">
                <span class="text-[10px] uppercase text-ink-dim">{m.short}</span>
                <Input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  placeholder="–"
                  size="sm"
                  value={meal[m.id] ?? ""}
                  oninput={(e) => updateMeal(date, meal.id, { [m.id]: e.target.value })}
                />
              </label>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <Button
      color="alternative"
      class="mt-3 w-full border-transparent bg-transparent"
      onclick={() => addMeal(date, {})}
    >
      + Mahlzeit
    </Button>
  </section>
</div>
