<script>
  import { untrack } from "svelte";

  let { title, open = false, children, onedit, ondelete, editMode = false } =
    $props();
  let isOpen = $state(untrack(() => open));
</script>

<div class="mb-2.5 overflow-hidden rounded-lg border border-line bg-card">
  <button
    class="flex w-full items-center justify-between border-none bg-transparent px-[18px] py-[15px] text-left text-[15px] font-semibold text-ink hover:bg-card-hover"
    onclick={() => (isOpen = !isOpen)}
  >
    <span>{title}</span>
    <span class="flex items-center gap-3">
      {#if editMode}
        <span
          class="cursor-pointer text-[13px] text-ink-dim hover:text-[var(--accent)]"
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
          class="cursor-pointer text-[13px] text-ink-dim hover:text-[var(--accent)]"
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
      <span
        class="text-[13px] text-ink-dim transition-transform duration-[180ms] {isOpen
          ? 'rotate-180'
          : ''}">▾</span
      >
    </span>
  </button>
  {#if isOpen}
    <div
      class="whitespace-pre-wrap px-[18px] pb-4 text-[14.5px] leading-relaxed text-ink-muted"
    >
      {@render children?.()}
    </div>
  {/if}
</div>
