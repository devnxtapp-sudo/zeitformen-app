<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { DAY_LABELS } from "../seed.js";
  import { typeById } from "../store.svelte.js";

  let {
    goal,
    dayKey,
    selected = false,
    onselect,
    onedit,
    editMode = false,
    weekDate = "",
    isToday = false,
    completed = false,
    ontoggle,
  } = $props();

  let day = $derived(goal.days[dayKey]);
  let type = $derived(typeById(goal, day.typeId));
</script>

<button
  class="day"
  class:selected
  class:rest={day.isRest}
  class:today={isToday}
  class:done={completed && !day.isRest}
  onclick={() => onselect?.(dayKey)}
>
  <div class="top">
    <span class="dow">{DAY_LABELS[dayKey]}</span>
    {#if editMode}
      <span
        class="edit-dot"
        role="button"
        tabindex="0"
        onclick={(e) => {
          e.stopPropagation();
          onedit?.(dayKey);
        }}
        onkeydown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onedit?.(dayKey);
          }
        }}
        aria-label="Tag bearbeiten">✎</span
      >
    {:else if !day.isRest}
      <span
        class="check"
        class:on={completed}
        role="button"
        tabindex="0"
        onclick={(e) => {
          e.stopPropagation();
          ontoggle?.(weekDate);
        }}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            ontoggle?.(weekDate);
          }
        }}
        aria-label={completed ? "Als nicht erledigt markieren" : "Als erledigt markieren"}
        title={completed ? "Erledigt" : "Als erledigt markieren"}>✓</span
      >
    {/if}
  </div>

  {#if day.isRest}
    <span class="badge rest-badge">{day.meta || "Ruhetag"}</span>
  {:else if type}
    <TypeBadge label={type.label} color={type.color} size="sm" />
  {/if}

  <div class="title">{day.title || "—"}</div>
  {#if day.meta && !day.isRest}
    <div class="meta">{day.meta}</div>
  {/if}
</button>

<style>
  .day {
    text-align: left;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 132px;
    transition: border-color 0.15s, background 0.15s, transform 0.05s;
    color: var(--text);
  }
  .day:hover {
    background: var(--card-hover);
    border-color: var(--border-strong);
  }
  .day.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .day.rest {
    background: var(--bg-elev);
  }
  .day.today {
    border-color: var(--border-strong);
  }
  .day.today .dow {
    color: var(--accent);
  }
  .day.done {
    border-color: rgba(95, 184, 122, 0.55);
    background: rgba(95, 184, 122, 0.07);
  }
  .check {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.13s;
    line-height: 1;
  }
  .check:hover {
    border-color: var(--c-zone2);
    color: var(--c-zone2);
  }
  .check.on {
    background: var(--c-zone2);
    border-color: var(--c-zone2);
    color: #0a0b0d;
    font-weight: 700;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .edit-dot {
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 2px;
  }
  .edit-dot:hover {
    color: var(--accent);
  }
  .rest-badge {
    color: var(--text-muted);
    background: var(--card);
    border: 1px solid var(--border);
    align-self: flex-start;
  }
  .title {
    font-size: 15px;
    font-weight: 650;
    line-height: 1.25;
    margin-top: 2px;
  }
  .meta {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.35;
  }
</style>
