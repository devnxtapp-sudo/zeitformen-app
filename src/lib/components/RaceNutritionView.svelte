<script>
  import { Button, Input, Label } from "flowbite-svelte";
  import { state as store } from "../store.svelte.js";
  import {
    setRaceMeta,
    addRacePhase,
    updateRacePhase,
    deleteRacePhase,
    addRaceItem,
    updateRaceItem,
    deleteRaceItem,
  } from "../store.svelte.js";

  let { onback } = $props();

  let plan = $derived(store.raceNutrition);

  // which item is currently expanded for editing (one at a time)
  let editingId = $state(null);

  const num = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const itemCarbs = (it) => num(it.qty) * num(it.carbsG);

  function phaseSum(p, key) {
    let t = 0;
    for (const it of p.items) t += num(it.qty) * num(it[key]);
    return t;
  }
  const phaseCarbs = (p) => phaseSum(p, "carbsG");

  function phaseGph(p) {
    const d = num(p.durationH);
    if (!d) return null;
    return Math.round(phaseCarbs(p) / d);
  }

  let totals = $derived.by(() => {
    const t = { carbsG: 0, fluidMl: 0, sodiumMg: 0, caffeineMg: 0 };
    for (const p of plan.phases) {
      for (const k of Object.keys(t)) t[k] += phaseSum(p, k);
    }
    return t;
  });

  let overallGph = $derived.by(() => {
    const d = num(plan.durationH);
    if (!d) return null;
    return Math.round(totals.carbsG / d);
  });

  // colour the big g/h green once we reach the target
  let onTarget = $derived(
    overallGph != null &&
      num(plan.targetGph) > 0 &&
      overallGph >= num(plan.targetGph),
  );

  function itemSubtitle(it) {
    const parts = [];
    if (it.type) parts.push(it.type);
    if (num(it.sodiumMg)) parts.push(`${it.sodiumMg} mg Na`);
    if (num(it.fluidMl)) parts.push(`${it.fluidMl} ml`);
    if (num(it.caffeineMg)) parts.push(`${it.caffeineMg} mg Koffein`);
    return parts.join(" · ");
  }

  function addItem(phaseId) {
    const it = addRaceItem(phaseId, {});
    editingId = it.id;
  }
</script>

<div class="mb-[22px] flex flex-col gap-3.5">
  <div class="flex items-center gap-2.5">
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-2xl leading-none text-ink-muted transition-colors hover:border-primary-500 hover:text-primary-400"
      onclick={() => onback?.()}
      aria-label="Zurück">‹</button>
    <h2 class="flex-1 text-lg font-semibold">Nutrition-Strategie</h2>
  </div>

  <section class="flex flex-col gap-3.5 rounded-xl border border-line bg-surface-elev p-4 px-[18px]">
    <input
      class="bg-none border-0 p-0 text-xs font-bold uppercase tracking-wide text-ink-muted focus:text-ink focus:outline-none"
      type="text"
      placeholder="Wettkampf benennen"
      value={plan.raceName}
      oninput={(e) => setRaceMeta({ raceName: e.target.value })}
    />
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-baseline gap-1 text-ink">
        <span class="text-[40px] font-extrabold leading-none {onTarget ? 'text-zone2' : ''}">{overallGph ?? "–"}</span>
        <span class="text-base font-semibold text-ink-muted">g/h</span>
      </div>
      <div class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(var(--accent-rgb),0.14)] px-3 py-1.5 text-[13px] font-semibold text-primary-400">
        <span aria-hidden="true">⚑</span>
        Ziel {plan.targetGph || "–"} g/h
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 border-t border-line pt-3.5">
      <div class="flex flex-col items-start gap-0.5"><span class="text-lg font-bold">{totals.carbsG}</span><span class="-mt-0.5 text-[11px] text-ink-muted">g</span><span class="text-[10px] uppercase tracking-wide text-ink-dim">Carbs</span></div>
      <div class="flex flex-col items-start gap-0.5"><span class="text-lg font-bold">{totals.fluidMl}</span><span class="-mt-0.5 text-[11px] text-ink-muted">ml</span><span class="text-[10px] uppercase tracking-wide text-ink-dim">Flüssigkeit</span></div>
      <div class="flex flex-col items-start gap-0.5"><span class="text-lg font-bold">{totals.sodiumMg}</span><span class="-mt-0.5 text-[11px] text-ink-muted">mg</span><span class="text-[10px] uppercase tracking-wide text-ink-dim">Natrium</span></div>
      <div class="flex flex-col items-start gap-0.5"><span class="text-lg font-bold">{totals.caffeineMg}</span><span class="-mt-0.5 text-[11px] text-ink-muted">mg</span><span class="text-[10px] uppercase tracking-wide text-ink-dim">Koffein</span></div>
    </div>

    <div class="grid grid-cols-2 gap-2.5">
      <div class="flex flex-col gap-1">
        <Label class="text-[11px] uppercase tracking-wide text-ink-dim">Ziel g/h</Label>
        <Input type="number" inputmode="decimal" min="0" placeholder="–"
          value={plan.targetGph} oninput={(e) => setRaceMeta({ targetGph: e.target.value })} />
      </div>
      <div class="flex flex-col gap-1">
        <Label class="text-[11px] uppercase tracking-wide text-ink-dim">Dauer (h)</Label>
        <Input type="number" inputmode="decimal" min="0" step="0.25" placeholder="–"
          value={plan.durationH} oninput={(e) => setRaceMeta({ durationH: e.target.value })} />
      </div>
    </div>
  </section>

  {#each plan.phases as phase (phase.id)}
    <section class="flex flex-col gap-2.5 rounded-xl border border-line bg-card p-3.5">
      <div class="flex items-center gap-2">
        <input
          class="min-w-0 flex-1 border-0 bg-none p-0 text-[13px] font-bold uppercase tracking-wide text-ink focus:outline-none"
          type="text"
          value={phase.name}
          oninput={(e) => updateRacePhase(phase.id, { name: e.target.value })}
        />
        {#if phaseGph(phase) != null}
          <span class="flex-none text-[13px] font-bold text-primary-400">{phaseGph(phase)} g/h</span>
        {/if}
        <button
          class="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-line bg-surface text-base leading-none text-ink-muted hover:border-rest hover:text-[var(--c-danger)]"
          onclick={() => deleteRacePhase(phase.id)} aria-label="Phase löschen">×</button>
      </div>

      <div class="flex flex-row items-center gap-2">
        <Label class="text-[11px] uppercase tracking-wide text-ink-dim">Dauer (h)</Label>
        <Input class="w-[90px]" type="number" inputmode="decimal" min="0" step="0.25" placeholder="–"
          value={phase.durationH} oninput={(e) => updateRacePhase(phase.id, { durationH: e.target.value })} />
      </div>

      <div class="flex flex-col gap-2">
        {#each phase.items as it (it.id)}
          <div class="overflow-hidden rounded-lg border bg-surface {editingId === it.id ? 'border-zone2' : 'border-line'}">
            <button
              class="flex w-full cursor-pointer items-center gap-3 border-0 bg-none px-3 py-[11px] text-left text-ink"
              onclick={() => (editingId = editingId === it.id ? null : it.id)}>
              <span class="flex-none rounded-md bg-[rgba(var(--accent-rgb),0.16)] px-2 py-1 text-[13px] font-bold text-primary-400">{num(it.qty)}×</span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate text-sm font-semibold">{it.name || "Eintrag"}</span>
                {#if itemSubtitle(it)}<span class="truncate text-xs text-ink-muted">{itemSubtitle(it)}</span>{/if}
              </span>
              <span class="flex-none text-[15px] font-bold">{itemCarbs(it)} g</span>
            </button>

            {#if editingId === it.id}
              <div class="grid grid-cols-2 gap-2.5 px-3 pb-3">
                <div class="col-span-full flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Name</Label>
                  <Input type="text" value={it.name}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { name: e.target.value })} /></div>
                <div class="col-span-full flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Art</Label>
                  <Input type="text" placeholder="z. B. Gel, Getränk / Mix" value={it.type}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { type: e.target.value })} /></div>
                <div class="flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Menge</Label>
                  <Input type="number" inputmode="numeric" min="0" value={it.qty}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { qty: e.target.value })} /></div>
                <div class="flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Carbs (g)</Label>
                  <Input type="number" inputmode="decimal" min="0" value={it.carbsG}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { carbsG: e.target.value })} /></div>
                <div class="flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Flüssigkeit (ml)</Label>
                  <Input type="number" inputmode="numeric" min="0" value={it.fluidMl}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { fluidMl: e.target.value })} /></div>
                <div class="flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Natrium (mg)</Label>
                  <Input type="number" inputmode="numeric" min="0" value={it.sodiumMg}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { sodiumMg: e.target.value })} /></div>
                <div class="flex flex-col gap-1">
                  <Label class="text-[10px] uppercase tracking-wide text-ink-dim">Koffein (mg)</Label>
                  <Input type="number" inputmode="numeric" min="0" value={it.caffeineMg}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { caffeineMg: e.target.value })} /></div>
                <Button color="red" class="col-span-full" onclick={() => { deleteRaceItem(phase.id, it.id); editingId = null; }}>
                  Eintrag löschen
                </Button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button
        class="cursor-pointer rounded-lg border border-dashed border-line bg-none p-2.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-zone2 hover:text-zone2"
        onclick={() => addItem(phase.id)}>+ Eintrag</button>
    </section>
  {/each}

  <button
    class="cursor-pointer rounded-xl border border-line bg-card p-[13px] text-sm font-semibold text-ink transition-colors hover:border-zone2"
    onclick={() => addRacePhase()}>+ Phase</button>
</div>
