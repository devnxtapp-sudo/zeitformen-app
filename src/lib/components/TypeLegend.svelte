<script>
  import TypeBadge from "./TypeBadge.svelte";

  let { types = [], restLabel = "Ruhetag" } = $props();
</script>

<div class="mb-4 flex flex-wrap gap-2">
  {#each types as t (t.id)}
    <TypeBadge label={t.label} color={t.color} />
  {/each}
  <span class="badge border border-line bg-card text-ink-muted">{restLabel}</span>
</div>
