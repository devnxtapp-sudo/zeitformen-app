<script>
  import ExerciseSwiper from "./ExerciseSwiper.svelte";
  import { Button } from "flowbite-svelte";
  import { weekDates, todayKey, dayKeyOf, parseYmd } from "../dateutil.js";
  import { weekOverview, dayStreak, weeklyLoad } from "../stats.js";
  import { formatInterval } from "../seed.js";
  import { updateLogEntry } from "../store.svelte.js";

  let { goal, ongotoplan } = $props();

  const week = weekDates();
  const today = todayKey();
  const todayDayKey = dayKeyOf(today);

  let todayDay = $derived(goal.days[todayDayKey]);
  let overview = $derived(weekOverview(goal, week, todayDayKey));
  let streak = $derived(dayStreak(goal, today));
  let load = $derived(weeklyLoad(goal));
  let todayType = $derived(
    (goal.types ?? []).find((t) => t.id === todayDay?.typeId) ?? null,
  );

  // ISO calendar week for the weekplan progress label.
  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (x.getUTCDay() + 6) % 7;
    x.setUTCDate(x.getUTCDate() - dayNum + 3);
    const firstThu = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((x - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  }
  let kw = $derived(isoWeek(parseYmd(today)));

  // today's planned distance (km) from interval amounts
  let distance = $derived.by(() => {
    let km = 0;
    for (const iv of todayDay?.session?.intervals ?? []) {
      const n = (Number(iv.repeat) || 1) * (Number(iv.amount) || 0);
      if (/km/i.test(iv.amountUnit || "")) km += n;
      else if (/^m$/i.test(iv.amountUnit || "")) km += n / 1000;
    }
    return km > 0 ? `${Math.round(km * 10) / 10} km` : null;
  });

  // key stats shown in the today card (only those with a value)
  let todayStats = $derived.by(() => {
    const s = [];
    if (todayDay?.meta) s.push({ label: "Dauer", value: todayDay.meta });
    if (distance) s.push({ label: "Distanz", value: distance });
    if (todayDay?.session?.intensity)
      s.push({ label: "Intensität", value: todayDay.session.intensity });
    return s;
  });

  // session breakdown: prefer the named content blocks, else the intervals
  let steps = $derived.by(() => {
    const blocks = (todayDay?.session?.blocks ?? []).filter(
      (b) => b.title?.trim() || b.items?.length,
    );
    if (blocks.length)
      return blocks.map((b) => ({ title: b.title || "Block", detail: (b.items ?? []).join(" · ") }));
    return (todayDay?.session?.intervals ?? []).map((iv) => ({
      title: iv.name || "Übung",
      detail: formatInterval(iv),
    }));
  });

  let started = $state(false);
  function startWorkout() {
    started = true;
  }
  function saveWorkout(exercises) {
    updateLogEntry(goal.id, week[todayDayKey], { exercises }, todayDayKey);
  }

  const card =
    "relative overflow-hidden rounded-2xl border border-line bg-card p-5";
  const eyebrow = "text-xs font-bold uppercase tracking-wide text-ink-muted";
</script>

<div class="grid gap-4 md:grid-cols-2">
  <!-- WOCHE -->
  <section class={card}>
    <span class="absolute inset-x-0 top-0 h-[3px] bg-primary-500"></span>
    <div class="mb-3 flex items-center justify-between">
      <span class={eyebrow}>Woche</span>
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
      </span>
    </div>
    <div class="text-[34px] font-extrabold leading-none text-primary-500">
      {overview.done}<span class="text-ink-dim">&nbsp;/&nbsp;{overview.planned}</span>
    </div>
    <div class="mt-2 flex items-center justify-between gap-2">
      <span class="text-sm text-ink-muted">Einheiten abgeschlossen</span>
      <span class="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">{overview.pct}%</span>
    </div>
    <div class="mt-4 grid grid-cols-7 gap-1.5">
      {#each overview.days as d (d.key)}
        <div
          class="h-9 rounded-md {d.status === 'done'
            ? 'bg-success'
            : d.status === 'today'
              ? 'bg-primary-500'
              : 'border border-line bg-surface'}"
          title={d.short}
        ></div>
      {/each}
    </div>
  </section>

  <!-- WOCHENLAST -->
  <section class={card}>
    <span class="absolute inset-x-0 top-0 h-[3px] bg-success"></span>
    <div class="mb-3 flex items-center justify-between">
      <span class={eyebrow}>Wochenlast</span>
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
      </span>
    </div>
    <div class="text-[34px] font-extrabold leading-none text-success">
      {load.hours}<span class="text-[20px] text-ink-dim"> h</span>
    </div>
    <div class="mt-2 text-sm text-ink-muted">
      Trainingsvolumen{#if load.estimated}<span class="text-ink-dim">&nbsp;(geschätzt)</span>{/if}
    </div>
    {#if load.segments.length}
      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {#each load.segments as s (s.label)}
          <span class="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span class="h-2 w-2 rounded-full" style="background:{s.color}"></span>{s.label}
          </span>
        {/each}
      </div>
      <div class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-surface">
        {#each load.segments as s (s.label)}
          <div style="width:{s.pct}%; background:{s.color}"></div>
        {/each}
      </div>
    {:else}
      <p class="mt-4 text-sm text-ink-dim">Keine geplanten Einheiten.</p>
    {/if}
  </section>

  <!-- STREAK -->
  <section class={card}>
    <span class="absolute inset-x-0 top-0 h-[3px] bg-streak"></span>
    <div class="mb-3 flex items-center justify-between">
      <span class={eyebrow}>Streak</span>
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-streak/15 text-streak">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3-1 4-2 6s-1 4 1 4c1 0 2-1 2-3 2 1 3 3 3 5a6 6 0 1 1-12 0c0-3 2-5 3-7 1-2 4-3 5-5z" /></svg>
      </span>
    </div>
    <div class="text-[34px] font-extrabold leading-none text-streak">{streak.current}</div>
    <div class="mt-2 flex items-center justify-between gap-2">
      <span class="text-sm text-ink-muted">Tage in Folge</span>
      {#if streak.current > 0 && streak.current >= streak.best}
        <span class="rounded-md bg-streak/15 px-2 py-0.5 text-xs font-bold text-streak">🔥 Persönlich</span>
      {:else if streak.best > 0}
        <span class="text-xs text-ink-dim">Rekord {streak.best}</span>
      {/if}
    </div>
    <div class="mt-4 grid grid-cols-7 gap-1.5">
      {#each Array(7) as _, i (i)}
        <div class="h-1.5 rounded-full {i < Math.min(streak.current, 7) ? 'bg-streak' : 'bg-surface border border-line'}"></div>
      {/each}
    </div>
  </section>

  <!-- HEUTIGES TRAINING -->
  <section class="{card} flex flex-col md:row-span-2">
    {#if todayDay.isRest}
      <span class={eyebrow}>Heute</span>
      <div class="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <div class="text-5xl">🌙</div>
        <p class="mt-3 text-lg font-bold text-ink">Ruhetag</p>
        <p class="mt-1 text-sm text-ink-muted">Erholung ist Teil des Plans.</p>
      </div>
    {:else}
      {#if todayType}
        <span class="self-start rounded-full bg-primary-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-400">{todayType.label}</span>
      {/if}
      <h3 class="mt-3 text-2xl font-bold text-ink">{todayDay.title || "Training"}</h3>
      {#if todayDay.session?.objective}
        <p class="mt-1.5 text-sm leading-relaxed text-ink-muted line-clamp-3">{todayDay.session.objective}</p>
      {/if}

      {#if todayStats.length}
        <div class="mt-4 grid gap-3 border-t border-line pt-4" style="grid-template-columns: repeat({todayStats.length}, minmax(0, 1fr))">
          {#each todayStats as s (s.label)}
            <div class="min-w-0">
              <div class="text-[10.5px] font-bold uppercase tracking-wide text-ink-dim">{s.label}</div>
              <div class="truncate text-[15px] font-bold text-ink">{s.value}</div>
            </div>
          {/each}
        </div>
      {/if}

      {#if !started}
        {#if steps.length}
          <div class="mt-4">
            <div class="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-dim">Session-Aufbau</div>
            <div class="flex flex-col gap-2">
              {#each steps as st, i (i)}
                <div class="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
                  <span class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-400">{i + 1}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold text-ink">{st.title}</div>
                    {#if st.detail}<div class="truncate text-xs text-ink-muted">{st.detail}</div>{/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        <Button
          color="primary"
          onclick={startWorkout}
          class="mt-4 w-full gap-2 py-[14px] text-[15px] font-bold text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.99]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><polygon points="6,4 20,12 6,20" fill="currentColor" /></svg>
          <span>Workout starten</span>
        </Button>
      {:else}
        <div class="mt-4">
          <ExerciseSwiper {goal} day={todayDay} onsave={saveWorkout} />
        </div>
      {/if}
    {/if}
  </section>

  <!-- WOCHENPLAN -->
  <section class={card}>
    <div class="mb-3 flex items-center justify-between">
      <span class="text-base font-bold text-ink">Wochenplan</span>
      <button class="text-sm font-semibold text-primary-400 hover:text-primary-300" onclick={() => ongotoplan?.()}>
        Bearbeiten ›
      </button>
    </div>
    <div class="grid grid-cols-7 gap-1.5">
      {#each overview.days as d (d.key)}
        <div
          class="flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center {d.isToday
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-line bg-surface'}"
        >
          <span class="text-[11px] font-bold text-ink-muted">{d.short}</span>
          <span class="h-1.5 w-1.5 rounded-full {d.status === 'done' ? 'bg-success' : d.status === 'today' ? 'bg-primary-500' : d.isRest ? 'bg-line' : 'bg-ink-dim'}"></span>
          <span class="w-full truncate text-[9px] leading-tight text-ink-dim">{d.label}</span>
        </div>
      {/each}
    </div>
    <div class="mt-4">
      <div class="mb-1.5 flex items-center justify-between text-xs">
        <span class="font-semibold text-ink-muted">Fortschritt KW {kw}</span>
        <span class="font-bold text-primary-400">{overview.done} / {overview.planned}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-surface">
        <div class="h-full rounded-full bg-primary-500 transition-[width] duration-300" style="width:{overview.pct}%"></div>
      </div>
    </div>
  </section>
</div>
