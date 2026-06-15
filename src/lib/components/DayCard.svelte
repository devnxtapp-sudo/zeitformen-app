<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { DAY_LABELS } from "../seed.js";
  import { typeById } from "../store.svelte.js";

  let {
    goal,
    dayKey,
    selected = false,
    onselect,
    editMode = false,
    weekDate = "",
    isToday = false,
    completed = false,
    ontoggle,
    dragging = false,
    dropTarget = false,
  } = $props();

  let day = $derived(goal.days[dayKey]);
  let type = $derived(typeById(goal, day.typeId));
  let extras = $derived(day.isRest ? [] : (day.extraSessions ?? []));
</script>

<button
  class="day"
  class:selected
  class:rest={day.isRest}
  class:today={isToday}
  class:done={completed}
  class:dragging
  class:drop-target={dropTarget}
  data-daykey={dayKey}
  onclick={() => onselect?.(dayKey)}
>
  <div class="top">
    <div class="top-left">
      <span class="dow">{DAY_LABELS[dayKey]}</span>
      {#if day.isRest}
        <span class="badge rest-badge">{day.meta || "Ruhetag"}</span>
      {:else}
        {#if type}
          <TypeBadge label={type.label} color={type.color} size="sm" />
        {/if}
        {#each extras as ex (ex.id)}
          {@const et = typeById(goal, ex.typeId)}
          {#if et}
            <TypeBadge label={et.label} color={et.color} size="sm" />
          {/if}
        {/each}
      {/if}
    </div>
    {#if !editMode}
      <span
        class="check"
        class:on={completed}
        role="button"
        tabindex="0"
        onclick={(e) => {
          e.stopPropagation();
          ontoggle?.(weekDate, dayKey);
        }}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            ontoggle?.(weekDate, dayKey);
          }
        }}
        aria-label={completed ? "Als nicht erledigt markieren" : "Als erledigt markieren"}
        title={completed ? "Erledigt" : "Als erledigt markieren"}>✓</span
      >
    {/if}
  </div>

  <div class="title">{day.title || "—"}</div>
  {#if day.meta && !day.isRest}
    <div class="meta">{day.meta}</div>
  {/if}
  {#each extras as ex (ex.id)}
    <div class="title second">{ex.title || "—"}</div>
    {#if ex.meta}
      <div class="meta">{ex.meta}</div>
    {/if}
  {/each}
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
    min-width: 0;
    overflow-wrap: anywhere;
    transition: border-color 0.15s, background 0.15s, transform 0.05s;
    color: var(--text);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
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
  .day.dragging {
    opacity: 0.35;
  }
  .day.drop-target {
    border-color: var(--accent);
    border-style: dashed;
    box-shadow: 0 0 0 1px var(--accent);
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
    gap: 8px;
  }
  .top-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
  }
  .dow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--text-muted);
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
  .title.second {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--border);
  }
  .meta {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.35;
  }
</style>
