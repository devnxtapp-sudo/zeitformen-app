<script>
  import DayCard from "./DayCard.svelte";
  import { DAY_KEYS } from "../seed.js";

  let { goal, selectedDay, onselect, onedit, editMode = false } = $props();
</script>

<div class="grid">
  {#each DAY_KEYS as key (key)}
    <DayCard
      {goal}
      dayKey={key}
      selected={selectedDay === key}
      {onselect}
      {onedit}
      {editMode}
    />
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 12px;
    margin-bottom: 22px;
  }
  @media (max-width: 860px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  @media (max-width: 560px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
  }
</style>
