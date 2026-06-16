<script>
  import Modal from "./Modal.svelte";
  import { COMPETITIONS, SPORTS } from "../sports.js";

  let { onpick, onclose, dismissable = true } = $props();

  let showCustom = $state(false);
  let customName = $state("");

  function choose(comp) {
    if (comp.custom) {
      showCustom = true;
      return;
    }
    onpick?.(SPORTS[comp.sportId], comp.label);
  }

  function confirmCustom() {
    const name = customName.trim();
    if (!name) return;
    onpick?.(SPORTS.custom, name);
  }
</script>

<Modal title="" {onclose} {dismissable}>
  <h4 class="picker-title">Wähle deinen Wettkampf</h4>
  <div class="grid">
    {#each COMPETITIONS as comp (comp.id)}
      <button
        class="sport"
        class:active={comp.custom && showCustom}
        onclick={() => choose(comp)}
      >
        <span class="label">{comp.label}</span>
      </button>
    {/each}
  </div>

  {#if showCustom}
    <div class="custom">
      <input
        bind:value={customName}
        placeholder="Name deines Wettkampfs"
        onkeydown={(e) => e.key === "Enter" && confirmCustom()}
      />
      <button class="btn btn-primary" disabled={!customName.trim()} onclick={confirmCustom}>
        Los geht's
      </button>
    </div>
  {/if}
</Modal>

<style>
  .picker-title {
    font-size: 17px;
    font-weight: 700;
    text-align: center;
    margin: 0 0 18px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .sport {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 16px 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s,
      transform 0.08s;
  }
  .sport:hover {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.08);
  }
  .sport:active {
    transform: scale(0.98);
  }
  .sport.active {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.12);
  }
  .label {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
    text-align: center;
  }
  .custom {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }
  .custom input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 12px 13px;
    font-size: 15px;
  }
  @media (max-width: 420px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
    .sport {
      padding: 14px 8px;
    }
  }
</style>
