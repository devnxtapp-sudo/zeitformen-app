<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { isCompleted, typeById } from "../store.svelte.js";
  import { modalityById, formatInterval } from "../seed.js";

  let { goal, dayKey, onedit, editMode = false, onlog, weekDate = "" } = $props();

  let day = $derived(goal.days[dayKey]);
  let extras = $derived(day.isRest ? [] : (day.extraSessions ?? []));

  // Tint the modality pill with the day's training-type colour, so it matches
  // the pill shown in the week plan (e.g. Kraft = orange, not the accent blue).
  function tint(hex, a) {
    const h = (hex || "#9aa0a6").replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
  }
</script>

{#snippet sessionView(s, sTypeId, sMeta)}
  {@const modality = modalityById(s.modality)}
  {@const intervals = s.intervals ?? []}
  {@const typeColor = typeById(goal, sTypeId)?.color ?? "#9aa0a6"}

  {#if sMeta}
    <div class="meta">{sMeta}</div>
  {/if}

  {#if s.objective}
    <p class="objective"><strong>Ziel:</strong> {s.objective}</p>
  {/if}

  {#if modality && intervals.length}
    <div class="proto">
      <div class="proto-head">
        <span
          class="mod-tag"
          style="color: {typeColor}; background: {tint(typeColor, 0.14)}; border: 1px solid {tint(typeColor, 0.32)};"
        >{modality.label}</span>
        {#if s.intensity}<span class="intensity">{s.intensity}</span>{/if}
      </div>
      <ul class="iv-list">
        {#each intervals as iv (iv)}
          <li>{formatInterval(iv)}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#each s.blocks ?? [] as block (block.title)}
    {#if block.title}
      <h4 class="block-title">{block.title}:</h4>
    {/if}
    {#if block.items?.length}
      <ul>
        {#each block.items as item}
          <li>{item}</li>
        {/each}
      </ul>
    {/if}
  {/each}

  {#if s.bonus}
    <p class="bonus"><strong>Bonus für {goal.sport || "Ziel"}:</strong> {s.bonus}</p>
  {/if}
{/snippet}

<section class="detail">
  <div class="head">
    {#if editMode}
      <button class="btn btn-sm" onclick={() => onedit?.(dayKey)}>✎ Bearbeiten</button>
    {:else if onlog && !day.isRest && weekDate}
      <button
        class="btn btn-sm"
        class:btn-primary={isCompleted(goal, weekDate)}
        onclick={() => onlog?.(weekDate, dayKey)}
      >
        {isCompleted(goal, weekDate) ? "✓ Protokoll" : "+ Protokoll"}
      </button>
    {/if}
  </div>

  {@render sessionView(day.session, day.typeId, day.meta)}

  {#each extras as ex, i (ex.id)}
    {@const et = typeById(goal, ex.typeId)}
    <div class="sess-divider">
      <span class="sess-num">{i + 2}. Session</span>
      {#if et}<TypeBadge label={et.label} color={et.color} size="sm" />{/if}
      {#if ex.title}<span class="sess-title">{ex.title}</span>{/if}
    </div>
    {@render sessionView(ex.session, ex.typeId, ex.meta)}
  {/each}
</section>

<style>
  .detail {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    margin-bottom: 20px;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 12px;
  }
  .meta {
    color: var(--text-muted);
    font-size: 14px;
    margin-top: 4px;
  }
  .sess-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 26px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
  }
  .sess-num {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .sess-title {
    font-size: 15px;
    font-weight: 650;
    color: var(--text);
  }
  .objective {
    margin-top: 18px;
    font-size: 15px;
  }
  .objective strong {
    color: var(--text);
  }
  .proto {
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elev);
  }
  .proto-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .mod-tag {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .intensity {
    font-size: 13.5px;
    color: var(--text-muted);
    font-weight: 600;
  }
  .iv-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .iv-list li {
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
  }
  .block-title {
    margin-top: 18px;
    font-size: 15px;
  }
  ul {
    margin: 10px 0 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  li {
    color: var(--text-muted);
    font-size: 14.5px;
  }
  .bonus {
    margin-top: 18px;
    font-size: 14.5px;
    color: var(--text-muted);
  }
  .bonus strong {
    color: var(--text);
  }
</style>
