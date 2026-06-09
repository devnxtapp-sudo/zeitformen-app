<script>
  import TypeBadge from "./TypeBadge.svelte";

  let { types = [], restLabel = "Ruhetag" } = $props();
</script>

<div class="legend">
  {#each types as t (t.id)}
    <TypeBadge label={t.label} color={t.color} />
  {/each}
  <span class="badge rest">{restLabel}</span>
</div>

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }
  .rest {
    color: var(--text-muted);
    background: var(--card);
    border: 1px solid var(--border);
  }
</style>
