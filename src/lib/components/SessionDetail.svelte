<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { typeById } from "../store.svelte.js";

  let { goal, dayKey, onedit, editMode = false } = $props();

  let day = $derived(goal.days[dayKey]);
  let type = $derived(typeById(goal, day.typeId));
  let s = $derived(day.session);
</script>

<section class="detail">
  <div class="head">
    <div class="head-left">
      {#if day.isRest}
        <span class="badge rest-badge">Ruhetag</span>
      {:else if type}
        <TypeBadge label={type.label} color={type.color} />
      {/if}
      <h2>{day.title || "—"}</h2>
    </div>
    {#if editMode}
      <button class="btn btn-sm" onclick={() => onedit?.(dayKey)}>✎ Bearbeiten</button>
    {/if}
  </div>

  {#if day.meta}
    <div class="meta">{day.meta}</div>
  {/if}

  {#if s.objective}
    <p class="objective"><strong>Ziel:</strong> {s.objective}</p>
  {/if}

  {#each s.blocks as block (block.title)}
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
    justify-content: space-between;
    gap: 12px;
  }
  .head-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .head h2 {
    font-size: 21px;
  }
  .rest-badge {
    color: var(--text-muted);
    background: var(--bg-elev);
    border: 1px solid var(--border);
  }
  .meta {
    color: var(--text-muted);
    font-size: 14px;
    margin-top: 4px;
  }
  .objective {
    margin-top: 18px;
    font-size: 15px;
  }
  .objective strong {
    color: var(--text);
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
