<script>
  import TypeBadge from "./TypeBadge.svelte";
  import { DAY_LABELS } from "../seed.js";
  import { typeById } from "../store.svelte.js";

  let {
    goal,
    dayKey,
    selected = false,
    onselect,
    editMode = false,
    weekDate = "",
    isToday = false,
    completed = false,
    ontoggle,
    dragging = false,
    dropTarget = false,
  } = $props();

  let day = $derived(goal.days[dayKey]);
  let type = $derived(typeById(goal, day.typeId));
  let extras = $derived(day.isRest ? [] : (day.extraSessions ?? []));
</script>

<button
  class={[
    "flex min-h-[132px] min-w-0 select-none flex-col gap-2 rounded-xl border bg-card px-3 pb-3.5 pt-3 text-left text-ink [overflow-wrap:anywhere] [-webkit-touch-callout:none] [transition:border-color_0.15s,background_0.15s,transform_0.05s] hover:bg-card-hover hover:border-line-strong",
    !selected && !dropTarget && !completed && "border-line",
    day.isRest && "!bg-surface-elev",
    (selected || dropTarget) && "border-primary-500 shadow-[0_0_0_1px_var(--accent)]",
    dropTarget && "border-dashed",
    isToday && !selected && !dropTarget && !completed && "border-line-strong",
    completed && !selected && !dropTarget && "border-zone2/55",
    completed && "bg-zone2/[0.07]",
    dragging && "opacity-35",
  ]}
  data-daykey={dayKey}
  onclick={() => onselect?.(dayKey)}
>
  <div class="flex items-center justify-between gap-2">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <span
        class="text-xs font-bold tracking-[0.08em]"
        class:text-primary-400={isToday}
        class:text-ink-muted={!isToday}>{DAY_LABELS[dayKey]}</span
      >
      {#if day.isRest}
        <span class="badge self-start border border-line bg-card text-ink-muted"
          >{day.meta || "Ruhetag"}</span
        >
      {:else}
        {#if type}
          <TypeBadge label={type.label} color={type.color} size="sm" />
        {/if}
        {#each extras as ex (ex.id)}
          {@const et = typeById(goal, ex.typeId)}
          {#if et}
            <TypeBadge label={et.label} color={et.color} size="sm" />
          {/if}
        {/each}
      {/if}
    </div>
    {#if !editMode}
      <span
        class="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border text-xs leading-none transition-all duration-[0.13s]"
        class:border-line-strong={!completed}
        class:text-ink-dim={!completed}
        class:hover:border-zone2={!completed}
        class:hover:text-zone2={!completed}
        class:border-zone2={completed}
        class:bg-zone2={completed}
        class:text-surface={completed}
        class:font-bold={completed}
        role="button"
        tabindex="0"
        onclick={(e) => {
          e.stopPropagation();
          ontoggle?.(weekDate, dayKey);
        }}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            ontoggle?.(weekDate, dayKey);
          }
        }}
        aria-label={completed ? "Als nicht erledigt markieren" : "Als erledigt markieren"}
        title={completed ? "Erledigt" : "Als erledigt markieren"}>✓</span
      >
    {/if}
  </div>

  <div class="mt-0.5 text-[15px] font-[650] leading-[1.25]">{day.title || "—"}</div>
  {#if day.meta && !day.isRest}
    <div class="text-xs leading-[1.35] text-ink-muted">{day.meta}</div>
  {/if}
  {#each extras as ex (ex.id)}
    <div class="mt-1.5 border-t border-dashed border-line pt-1.5 text-[15px] font-[650] leading-[1.25]">
      {ex.title || "—"}
    </div>
    {#if ex.meta}
      <div class="text-xs leading-[1.35] text-ink-muted">{ex.meta}</div>
    {/if}
  {/each}
</button>
