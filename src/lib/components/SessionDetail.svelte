<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { isCompleted, typeById } from "../store.svelte.js";
  import { modalityById, formatInterval } from "../seed.js";
  import { Button } from "flowbite-svelte";

  let { goal, dayKey, onedit, editMode = false, onlog, weekDate = "" } = $props();

  let day = $derived(goal.days[dayKey]);
  let extras = $derived(day.isRest ? [] : (day.extraSessions ?? []));

  // Tint the modality pill with the day's training-type colour, so it matches
  // the pill shown in the week plan (e.g. Kraft = orange, not the accent blue).
  function tint(hex, a) {
    const h = (hex || "#9aa0a6").replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
  }
</script>

{#snippet sessionView(s, sTypeId, sMeta)}
  {@const modality = modalityById(s.modality)}
  {@const intervals = s.intervals ?? []}
  {@const typeColor = typeById(goal, sTypeId)?.color ?? "#9aa0a6"}

  {#if sMeta}
    <div class="mt-1 text-sm text-ink-muted">{sMeta}</div>
  {/if}

  {#if s.objective}
    <p class="mt-[18px] text-[15px]"><strong class="text-ink">Ziel:</strong> {s.objective}</p>
  {/if}

  {#if modality && intervals.length}
    <div class="mt-[18px] rounded-lg border border-line bg-surface-elev px-4 py-3.5">
      <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
        <span
          class="rounded-full px-2.5 py-[3px] text-xs font-bold uppercase tracking-[0.04em]"
          style="color: {typeColor}; background: {tint(typeColor, 0.14)}; border: 1px solid {tint(typeColor, 0.32)};"
        >{modality.label}</span>
        {#if s.intensity}<span class="text-[13.5px] font-semibold text-ink-muted">{s.intensity}</span>{/if}
      </div>
      <ul class="flex flex-col gap-1.5 pl-[18px]">
        {#each intervals as iv (iv)}
          <li class="list-disc text-[15px] font-semibold text-ink">{formatInterval(iv)}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#each s.blocks ?? [] as block (block.title)}
    {#if block.title}
      <h4 class="mt-[18px] text-[15px] font-semibold">{block.title}:</h4>
    {/if}
    {#if block.items?.length}
      <ul class="mt-2.5 flex flex-col gap-2 pl-5">
        {#each block.items as item}
          <li class="list-disc text-[14.5px] text-ink-muted">{item}</li>
        {/each}
      </ul>
    {/if}
  {/each}

  {#if s.bonus}
    <p class="mt-[18px] text-[14.5px] text-ink-muted"><strong class="text-ink">Bonus für {goal.sport || "Ziel"}:</strong> {s.bonus}</p>
  {/if}
{/snippet}

<section class="mb-5 rounded-xl border border-line bg-card px-6 py-[22px]">
  <div class="flex items-start justify-end gap-3">
    {#if editMode}
      <Button color="alternative" size="sm" onclick={() => onedit?.(dayKey)}>✎ Bearbeiten</Button>
    {:else if onlog && !day.isRest && weekDate}
      {#if isCompleted(goal, weekDate)}
        <Button
          color="primary"
          size="sm"
          class="font-semibold text-[var(--on-accent)]"
          onclick={() => onlog?.(weekDate, dayKey)}
        >✓ Protokoll</Button>
      {:else}
        <Button
          color="alternative"
          size="sm"
          onclick={() => onlog?.(weekDate, dayKey)}
        >+ Protokoll</Button>
      {/if}
    {/if}
  </div>

  {@render sessionView(day.session, day.typeId, day.meta)}

  {#each extras as ex, i (ex.id)}
    {@const et = typeById(goal, ex.typeId)}
    <div class="mt-[26px] flex flex-wrap items-center gap-2.5 border-t border-line pt-[18px]">
      <span class="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">{i + 2}. Session</span>
      {#if et}<TypeBadge label={et.label} color={et.color} size="sm" />{/if}
      {#if ex.title}<span class="text-[15px] font-[650] text-ink">{ex.title}</span>{/if}
    </div>
    {@render sessionView(ex.session, ex.typeId, ex.meta)}
  {/each}
</section>
