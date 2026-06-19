<script>
  import { Button, Input } from "flowbite-svelte";
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
  <h4 class="mb-[18px] text-center text-[17px] font-bold text-ink">Wähle deinen Wettkampf</h4>
  <div class="grid grid-cols-2 gap-2.5">
    {#each COMPETITIONS as comp (comp.id)}
      <button
        class="flex min-h-[56px] items-center justify-center rounded-xl border border-line bg-card px-2 py-3.5 text-center text-sm font-semibold text-ink transition-[border-color,background,transform] duration-100 hover:border-[var(--accent)] hover:bg-[rgba(var(--accent-rgb),0.08)] active:scale-[0.98] sm:px-3.5 sm:py-4"
        class:!border-[var(--accent)]={comp.custom && showCustom}
        class:!bg-[rgba(var(--accent-rgb),0.12)]={comp.custom && showCustom}
        onclick={() => choose(comp)}
      >
        <span>{comp.label}</span>
      </button>
    {/each}
  </div>

  {#if showCustom}
    <div class="mt-3.5 flex gap-2.5">
      <Input
        bind:value={customName}
        class="min-w-0 flex-auto"
        placeholder="Name deines Wettkampfs"
        onkeydown={(e) => e.key === "Enter" && confirmCustom()}
      />
      <Button
        color="primary"
        class="shrink-0 font-semibold text-[var(--on-accent)]"
        disabled={!customName.trim()}
        onclick={confirmCustom}
      >
        Los geht's
      </Button>
    </div>
  {/if}
</Modal>
