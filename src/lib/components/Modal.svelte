<script>
  let { title = "", onclose, children } = $props();

  function onkeydown(e) {
    if (e.key === "Escape") onclose?.();
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={() => onclose?.()} role="presentation">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
  >
    <header>
      <h3>{title}</h3>
      <button class="btn-ghost close" onclick={() => onclose?.()} aria-label="Schließen">✕</button>
    </header>
    <div class="body">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px;
    z-index: 100;
    overflow-y: auto;
  }
  .modal {
    background: var(--bg-elev);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    width: 100%;
    max-width: 560px;
    box-shadow: var(--shadow);
    animation: pop 0.14s ease-out;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.985);
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
  }
  header h3 {
    font-size: 16px;
  }
  .close {
    font-size: 15px;
  }
  .body {
    padding: 18px;
  }
</style>
