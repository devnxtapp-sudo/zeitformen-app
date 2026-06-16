<script>
  import WeekProgress from "./WeekProgress.svelte";
  import SessionDetail from "./SessionDetail.svelte";
  import StatsView from "./StatsView.svelte";
  import ExerciseSwiper from "./ExerciseSwiper.svelte";
  import { weekDates, todayKey, dayKeyOf } from "../dateutil.js";
  import { updateLogEntry } from "../store.svelte.js";

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

<section class="today-block">
  <div class="today-head">
    <span class="eyebrow">Heutiges Training</span>
  </div>
  <SessionDetail
    {goal}
    dayKey={todayDayKey}
    weekDate={week[todayDayKey]}
  />

  {#if !todayDay.isRest}
    {#if !started}
      <button class="start-btn" onclick={startWorkout}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="6,4 20,12 6,20" fill="currentColor" />
        </svg>
        <span>Workout starten</span>
      </button>
    {:else}
      <ExerciseSwiper {goal} day={todayDay} onsave={saveWorkout} />
    {/if}
  {/if}

  <button class="plan-link" onclick={() => ongotoplan?.()}>
    <span>Wochenplan ansehen</span>
    <span class="chev" aria-hidden="true">›</span>
  </button>
</section>

<WeekProgress {goal} {week} />

<StatsView {goal} />

<style>
  .today-block {
    margin-bottom: 18px;
  }
  .today-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .start-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 12px;
    padding: 15px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    color: var(--on-accent);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
  }
  .start-btn:hover {
    filter: brightness(1.08);
  }
  .start-btn:active {
    transform: scale(0.99);
  }
  .plan-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 12px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--accent);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .plan-link:hover {
    border-color: var(--accent);
    background: var(--card-hover);
  }
  .plan-link .chev {
    font-size: 18px;
    line-height: 1;
  }
</style>
