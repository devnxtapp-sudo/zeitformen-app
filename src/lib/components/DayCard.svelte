<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { DAY_LABELS } from "../seed.js";
  import { typeById } from "../store.svelte.js";

  let { goal, dayKey, selected = false, onselect, onedit, editMode = false } =
    $props();

  let day = $derived(goal.days[dayKey]);
  let type = $derived(typeById(goal, day.typeId));
</script>

<button
  class="day"
  class:selected
  class:rest={day.isRest}
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
