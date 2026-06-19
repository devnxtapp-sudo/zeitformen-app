<script>
  import WeekProgress from "./WeekProgress.svelte";
  import SessionDetail from "./SessionDetail.svelte";
  import StatsView from "./StatsView.svelte";
  import ExerciseSwiper from "./ExerciseSwiper.svelte";
  import { weekDates, todayKey, dayKeyOf } from "../dateutil.js";
  import { updateLogEntry } from "../store.svelte.js";
  import { Button } from "flowbite-svelte";

  let { goal, ongotoplan } = $props();

  const week = weekDates();
  const today = todayKey();
  const todayDayKey = dayKeyOf(today);

  let todayDay = $derived(goal.days[todayDayKey]);

  let started = $state(false);

  function startWorkout() {
    started = true;
  }

  // Werte aus dem Swiper in den Trainingslog des heutigen Tages schreiben.
  // updateLogEntry legt den Eintrag bei Bedarf an (markiert damit auch erledigt).
  function saveWorkout(exercises) {
    updateLogEntry(goal.id, week[todayDayKey], { exercises }, todayDayKey);
  }
</script>

<section class="mb-[18px]">
  <div class="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
    <span class="text-xs font-bold uppercase tracking-wide text-primary-400">Heutiges Training</span>
  </div>
  <SessionDetail
    {goal}
    dayKey={todayDayKey}
    weekDate={week[todayDayKey]}
  />

  {#if !todayDay.isRest}
    {#if !started}
      <Button
        color="primary"
        onclick={startWorkout}
        class="mb-3 w-full gap-2 py-[15px] text-[15px] font-bold text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.99]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="6,4 20,12 6,20" fill="currentColor" />
        </svg>
        <span>Workout starten</span>
      </Button>
    {:else}
      <ExerciseSwiper {goal} day={todayDay} onsave={saveWorkout} />
    {/if}
  {/if}

  <Button
    color="alternative"
    onclick={() => ongotoplan?.()}
    class="w-full gap-1.5 rounded-xl border-line bg-card py-3 text-sm font-semibold text-primary-400 transition hover:border-[var(--accent)] hover:bg-card-hover"
  >
    <span>Wochenplan ansehen</span>
    <span class="text-lg leading-none" aria-hidden="true">›</span>
  </Button>
</section>

<WeekProgress {goal} {week} />

<StatsView {goal} />
