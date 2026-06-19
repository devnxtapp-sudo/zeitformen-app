<script>
  import { state } from "../store.svelte.js";
  import {
    setPacklistMeta,
    addPacklistCategory,
    updatePacklistCategory,
    deletePacklistCategory,
    addPacklistItem,
    updatePacklistItem,
    togglePacklistItem,
    deletePacklistItem,
  } from "../store.svelte.js";
  import { Button, Input, Progressbar } from "flowbite-svelte";

  let { onback } = $props();

  let plan = $derived(state.packlist);

  let stats = $derived.by(() => {
    let total = 0;
    let done = 0;
    for (const c of plan.categories) {
      for (const it of c.items) {
        total++;
        if (it.done) done++;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  });
</script>

<div class="mb-[22px] flex flex-col gap-3.5">
  <div class="subpage-head">
    <button class="back-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
    <h2>Packliste</h2>
  </div>

  <section class="flex flex-col gap-3 rounded-xl border border-line bg-surface-elev px-[18px] py-4">
    <Input
      type="text"
      placeholder="Wettkampf benennen"
      value={plan.raceName}
      oninput={(e) => setPacklistMeta({ raceName: e.target.value })}
      class="border-0 bg-transparent px-0 py-0 text-xs font-bold uppercase tracking-wide text-ink-muted focus:text-ink focus:ring-0"
    />
    <div class="flex items-baseline justify-between gap-2.5">
      <span class="text-[34px] font-extrabold leading-none">{stats.pct}%</span>
      <span class="text-[13px] font-semibold text-ink-muted">{stats.done} von {stats.total} erledigt</span>
    </div>
    <Progressbar
      progress={stats.pct}
      color="primary"
      size="h-2"
      animate
      class="bg-surface"
    />
  </section>

  {#each plan.categories as cat (cat.id)}
    <section class="flex flex-col gap-2 rounded-xl border border-line bg-card p-3.5">
      <div class="mb-0.5 flex items-center gap-2">
        <Input
          type="text"
          value={cat.name}
          oninput={(e) => updatePacklistCategory(cat.id, { name: e.target.value })}
          class="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[13px] font-bold uppercase tracking-wide text-ink focus:ring-0"
        />
        <button
          class="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-line bg-surface text-base leading-none text-ink-muted hover:border-rest hover:text-rest"
          onclick={() => deletePacklistCategory(cat.id)}
          aria-label="Kategorie löschen"
        >×</button>
      </div>

      <div class="flex flex-col gap-1.5">
        {#each cat.items as it (it.id)}
          <div class="group flex items-center gap-2.5">
            <button
              class="flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 bg-surface text-[var(--on-accent)] {it.done ? 'border-primary-500 bg-primary-500' : 'border-line'}"
              onclick={() => togglePacklistItem(cat.id, it.id)}
              aria-pressed={it.done}
              aria-label="Erledigt umschalten"
            >
              {#if it.done}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              {/if}
            </button>
            <Input
              type="text"
              value={it.label}
              placeholder="Eintrag"
              oninput={(e) => updatePacklistItem(cat.id, it.id, { label: e.target.value })}
              class="min-w-0 flex-1 border-0 bg-transparent px-0 py-1.5 text-[15px] text-ink focus:ring-0 {it.done ? 'text-ink-dim line-through' : ''}"
            />
            <button
              class="flex h-6 w-6 flex-none items-center justify-center border-0 bg-transparent text-lg leading-none text-ink-dim opacity-60 hover:text-rest hover:opacity-100"
              onclick={() => deletePacklistItem(cat.id, it.id)}
              aria-label="Eintrag löschen"
            >×</button>
          </div>
        {/each}
      </div>

      <button
        class="self-start border-0 bg-transparent py-1.5 text-[13px] font-semibold text-ink-muted hover:text-zone2"
        onclick={() => addPacklistItem(cat.id, "")}
      >+ Eintrag</button>
    </section>
  {/each}

  <Button
    color="alternative"
    onclick={() => addPacklistCategory()}
    class="rounded-xl border-line bg-card p-[13px] text-sm font-semibold text-ink hover:border-zone2"
  >+ Kategorie</Button>
</div>
