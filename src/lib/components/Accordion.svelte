<script>
  import { untrack } from "svelte";

  let { title, open = false, children, onedit, ondelete, editMode = false } =
    $props();
  let isOpen = $state(untrack(() => open));
</script>

<div class="acc" class:open={isOpen}>
  <button class="acc-head" onclick={() => (isOpen = !isOpen)}>
    <span class="acc-title">{title}</span>
    <span class="actions">
      {#if editMode}
        <span
          class="mini"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.stopPropagation();
            onedit?.();
          }}
          onkeydown={(e) => e.key === "Enter" && (e.stopPropagation(), onedit?.())}
          aria-label="Bearbeiten">✎</span
        >
        <span
          class="mini"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.stopPropagation();
            ondelete?.();
          }}
          onkeydown={(e) => e.key === "Enter" && (e.stopPropagation(), ondelete?.())}
          aria-label="Löschen">🗑</span
        >
      {/if}
      <span class="chevron">▾</span>
    </span>
  </button>
  {#if isOpen}
    <div class="acc-body">{@render children?.()}</div>
  {/if}
</div>

<style>
  .acc {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 10px;
    overflow: hidden;
  }
  .acc-head {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 18px;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
  }
  .acc-head:hover {
    background: var(--card-hover);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .mini {
    font-size: 13px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .mini:hover {
    color: var(--accent);
  }
  .chevron {
    color: var(--text-dim);
    transition: transform 0.18s;
    font-size: 13px;
  }
  .acc.open .chevron {
    transform: rotate(180deg);
  }
  .acc-body {
    padding: 0 18px 16px;
    color: var(--text-muted);
    font-size: 14.5px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
</style>
