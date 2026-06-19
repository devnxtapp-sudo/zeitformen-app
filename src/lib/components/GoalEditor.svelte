<script>
  import Modal from "./Modal.svelte";
  import { SPORT_LIST, getSport } from "../sports.js";
  import {
    updateGoalMeta,
    addType,
    updateType,
    deleteType,
    deleteGoal,
  } from "../store.svelte.js";
  import { Button, Input, Select, Textarea, Label } from "flowbite-svelte";

  let { goal, onclose } = $props();

  function patch(field, value) {
    updateGoalMeta(goal.id, { [field]: value });
  }

  // category suggestions follow the goal's sport
  let categoryOptions = $derived(getSport(goal.sportId)?.categories ?? []);

  function changeSport(id) {
    const sport = getSport(id);
    // switch the sport id and update the display label if it still matched the
    // previous preset (don't clobber a custom name the user typed)
    const patchObj = { sportId: id };
    const prev = getSport(goal.sportId);
    if (!goal.sport || goal.sport === prev?.label) patchObj.sport = sport?.label ?? "";
    updateGoalMeta(goal.id, patchObj);
  }

  function confirmDelete() {
    if (confirm(`Trainingsziel „${goal.name}" wirklich löschen?`)) {
      deleteGoal(goal.id);
      onclose?.();
    }
  }
</script>

<Modal title="Trainingsziel bearbeiten" {onclose}>
  <div class="mb-3.5">
    <Label for="g-name" class="mb-1.5 block text-xs font-semibold text-ink-muted">Name</Label>
    <Input id="g-name" value={goal.name} oninput={(e) => patch("name", e.target.value)} />
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="mb-3.5 min-w-0">
      <Label for="g-sportid" class="mb-1.5 block text-xs font-semibold text-ink-muted">Sportart</Label>
      <Select
        id="g-sportid"
        placeholder=""
        value={goal.sportId}
        onchange={(e) => changeSport(e.target.value)}
      >
        {#each SPORT_LIST as s (s.id)}
          <option value={s.id}>{s.label}</option>
        {/each}
      </Select>
    </div>
    <div class="mb-3.5 min-w-0">
      <Label for="g-date" class="mb-1.5 block text-xs font-semibold text-ink-muted">Zieldatum</Label>
      <Input
        id="g-date"
        type="date"
        value={goal.targetDate}
        oninput={(e) => patch("targetDate", e.target.value)}
      />
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="mb-3.5 min-w-0">
      <Label for="g-target" class="mb-1.5 block text-xs font-semibold text-ink-muted">Übergeordnetes Ziel</Label>
      <Input
        id="g-target"
        value={goal.targetGoal}
        oninput={(e) => patch("targetGoal", e.target.value)}
        placeholder="z.B. sub60"
      />
    </div>
    <div class="mb-3.5 min-w-0">
      <Label for="g-cat" class="mb-1.5 block text-xs font-semibold text-ink-muted">Klasse</Label>
      <Input
        id="g-cat"
        list="cat-options"
        value={goal.category}
        oninput={(e) => patch("category", e.target.value)}
        placeholder="z.B. Doubles"
      />
      <datalist id="cat-options">
        {#each categoryOptions as opt (opt)}
          <option value={opt}></option>
        {/each}
      </datalist>
    </div>
  </div>

  <div class="mb-3.5">
    <Label for="g-desc" class="mb-1.5 block text-xs font-semibold text-ink-muted">Beschreibung</Label>
    <Textarea
      id="g-desc"
      rows={3}
      value={goal.description}
      oninput={(e) => patch("description", e.target.value)}
    />
  </div>

  <div class="mt-1.5">
    <div class="mb-2.5 flex items-center justify-between">
      <span class="text-xs font-semibold text-ink-muted">Trainingstypen</span>
      <Button size="sm" color="alternative" onclick={() => addType(goal.id)}>+ Typ</Button>
    </div>
    {#each goal.types as t (t.id)}
      <div class="mb-2 flex items-center gap-2">
        <input
          type="color"
          value={t.color}
          oninput={(e) => updateType(goal.id, t.id, { color: e.target.value })}
          class="h-[38px] w-11 flex-none cursor-pointer rounded-lg border border-line bg-card p-[3px]"
        />
        <Input
          class="flex-1"
          value={t.label}
          oninput={(e) => updateType(goal.id, t.id, { label: e.target.value })}
        />
        <Button
          size="sm"
          color="red"
          class="!p-2"
          onclick={() => deleteType(goal.id, t.id)}>✕</Button
        >
      </div>
    {/each}
  </div>

  <div class="mt-[18px] flex items-center justify-between gap-2.5">
    <Button color="red" onclick={confirmDelete}>Ziel löschen</Button>
    <Button
      color="primary"
      class="font-semibold text-[var(--on-accent)]"
      onclick={() => onclose?.()}>Fertig</Button
    >
  </div>
</Modal>
