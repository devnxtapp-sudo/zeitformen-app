<script>
  // Nested settings drawer. `onback` returns to the main profile menu,
  // `onclose` closes everything. Item callbacks (e.g. onaccount) open a page.
  let { onback, onclose, onaccount, ongarmin } = $props();

  const OFFSCREEN = -380;
  let dragX = $state(0);
  let dragging = $state(false);
  let closing = $state(false);
  let startX = 0;

  // closing this drawer means going back to the main menu
  function back() {
    if (closing) return;
    closing = true;
    dragX = OFFSCREEN;
    setTimeout(() => onback?.(), 220);
  }

  function onPointerDown(e) {
    if (closing) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    dragX = Math.min(0, e.clientX - startX);
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (dragX < -70) back();
    else dragX = 0;
  }
  function onKey(e) {
    if (e.key === "Escape") back();
  }
</script>

<svelte:window
  onkeydown={onKey}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
/>

<div
  class="overlay fixed inset-0 z-[1002] bg-black/55"
  class:closing
  onclick={() => onclose?.()}
  role="presentation"
></div>

<aside
  class="drawer fixed inset-y-0 left-0 z-[1003] flex w-[min(84vw,320px)] flex-col overflow-y-auto border-r border-line bg-surface-elev pt-7 pb-4 [touch-action:pan-y] [will-change:transform]"
  class:dragging
  style="transform: translateX({dragX}px)"
  onpointerdown={onPointerDown}
>
  <header class="flex items-center gap-2.5 px-4 pt-0.5 pb-[22px]">
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-ink-muted hover:bg-card hover:text-ink"
      onclick={back}
      aria-label="Zurück"
    >‹</button>
    <span class="text-lg font-bold tracking-tight text-ink">Einstellungen</span>
  </header>

  <nav class="flex flex-col border-t border-line pt-2">
    {#if onaccount}
      <button
        class="flex w-full cursor-pointer items-center gap-4 px-[22px] py-3.5 text-left text-[15px] font-semibold text-ink hover:bg-card"
        onclick={() => { onaccount(); onclose?.(); }}
      >
        <span class="w-[22px] flex-none text-center text-[17px] text-ink-muted" aria-hidden="true">◐</span>
        <span>Konto</span>
        <span class="ml-auto text-xl text-ink-dim" aria-hidden="true">›</span>
      </button>
    {/if}
    {#if ongarmin}
      <button
        class="flex w-full cursor-pointer items-center gap-4 px-[22px] py-3.5 text-left text-[15px] font-semibold text-ink hover:bg-card"
        onclick={() => { ongarmin(); onclose?.(); }}
      >
        <span class="w-[22px] flex-none text-center text-[17px] text-ink-muted" aria-hidden="true">◎</span>
        <span>Uhr / Tracker verbinden</span>
        <span class="ml-auto text-xl text-ink-dim" aria-hidden="true">›</span>
      </button>
    {/if}
  </nav>
</aside>

<style>
  /* Entrance/exit + drag transitions can't be expressed cleanly as utilities. */
  .overlay {
    animation: fade-in 0.18s ease;
  }
  .overlay.closing {
    animation: fade-out 0.22s ease forwards;
  }
  .drawer {
    animation: slide-in 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .drawer:not(.dragging) {
    transition: transform 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  @keyframes slide-in {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
</style>
