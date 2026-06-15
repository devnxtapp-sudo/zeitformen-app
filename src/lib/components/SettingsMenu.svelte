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

<div class="overlay" class:closing onclick={() => onclose?.()} role="presentation"></div>

<aside
  class="drawer"
  class:dragging
  style="transform: translateX({dragX}px)"
  onpointerdown={onPointerDown}
>
  <header class="head">
    <button class="back-btn" onclick={back} aria-label="Zurück">‹</button>
    <span class="title">Einstellungen</span>
  </header>

  <nav class="menu">
    {#if onaccount}
      <button class="item" onclick={() => { onaccount(); onclose?.(); }}>
        <span class="ic" aria-hidden="true">◐</span>
        <span>Konto</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
    {/if}
    {#if ongarmin}
      <button class="item" onclick={() => { ongarmin(); onclose?.(); }}>
        <span class="ic" aria-hidden="true">◎</span>
        <span>Uhr / Tracker verbinden</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
    {/if}
  </nav>
</aside>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 1002;
    animation: fade-in 0.18s ease;
  }
  .overlay.closing {
    animation: fade-out 0.22s ease forwards;
  }
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(84vw, 320px);
    background: var(--bg-elev);
    border-right: 1px solid var(--border);
    z-index: 1003;
    display: flex;
    flex-direction: column;
    padding: 28px 0 16px;
    overflow-y: auto;
    will-change: transform;
    touch-action: pan-y;
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
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 2px 16px 22px;
  }
  .title {
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .menu {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 14px 22px;
    background: none;
    border: none;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .item:hover {
    background: var(--card);
  }
  .ic {
    flex: 0 0 auto;
    width: 22px;
    font-size: 17px;
    text-align: center;
    color: var(--text-muted);
  }
  .chev {
    margin-left: auto;
    color: var(--text-dim);
    font-size: 20px;
  }
</style>
