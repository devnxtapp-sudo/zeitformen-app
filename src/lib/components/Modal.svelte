<script>
  import { Button } from "flowbite-svelte";

  let { title = "", onclose, dismissable = true, children } = $props();

  function onkeydown(e) {
    if (e.key === "Escape" && dismissable) onclose?.();
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
  onclick={() => dismissable && onclose?.()}
  role="presentation"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="pop relative w-full max-w-[560px] rounded-xl border border-line-strong bg-surface-elev shadow-[var(--shadow)]"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    {#if title}
      <header class="flex items-center justify-between border-b border-line px-[18px] py-4">
        <h3 class="text-base font-semibold text-ink">{title}</h3>
        {#if dismissable}
          <Button
            color="alternative"
            class="border-transparent bg-transparent !p-2 text-[15px] text-ink-muted hover:text-ink"
            onclick={() => onclose?.()}
            aria-label="Schließen"
          >✕</Button>
        {/if}
      </header>
    {:else if dismissable}
      <!-- title-less modal: no header bar, just a floating close in the corner -->
      <button
        class="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[15px] text-ink-muted transition-colors hover:bg-card-hover hover:text-ink"
        onclick={() => onclose?.()}
        aria-label="Schließen"
      >✕</button>
    {/if}
    <div class="p-[18px]">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .pop {
    animation: pop 0.14s ease-out;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.985);
    }
  }
</style>
