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
  <div class="field">
    <label for="g-name">Name</label>
    <input id="g-name" value={goal.name} oninput={(e) => patch("name", e.target.value)} />
  </div>

  <div class="row2">
    <div class="field">
      <label for="g-sportid">Sportart</label>
      <select
        id="g-sportid"
        value={goal.sportId}
        onchange={(e) => changeSport(e.target.value)}
      >
        {#each SPORT_LIST as s (s.id)}
          <option value={s.id}>{s.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="g-date">Zieldatum</label>
      <input
        id="g-date"
        type="date"
        value={goal.targetDate}
        oninput={(e) => patch("targetDate", e.target.value)}
      />
    </div>
  </div>

  <div class="row2">
    <div class="field">
      <label for="g-target">Übergeordnetes Ziel</label>
      <input
        id="g-target"
        value={goal.targetGoal}
        oninput={(e) => patch("targetGoal", e.target.value)}
        placeholder="z.B. sub60"
      />
    </div>
    <div class="field">
      <label for="g-cat">Klasse</label>
      <input
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

  <div class="field">
    <label for="g-desc">Beschreibung</label>
    <textarea
      id="g-desc"
      value={goal.description}
      oninput={(e) => patch("description", e.target.value)}
    ></textarea>
  </div>

  <div class="types">
    <div class="types-head">
      <span class="caption">Trainingstypen</span>
      <button class="btn btn-sm" onclick={() => addType(goal.id)}>+ Typ</button>
    </div>
    {#each goal.types as t (t.id)}
      <div class="type-row">
        <input
          type="color"
          value={t.color}
          oninput={(e) => updateType(goal.id, t.id, { color: e.target.value })}
          class="color"
        />
        <input
          value={t.label}
          oninput={(e) => updateType(goal.id, t.id, { label: e.target.value })}
        />
        <button
          class="btn btn-sm btn-danger"
          onclick={() => deleteType(goal.id, t.id)}>✕</button
        >
      </div>
    {/each}
  </div>

  <div class="actions">
    <button class="btn btn-danger" onclick={confirmDelete}>Ziel löschen</button>
    <button class="btn btn-primary" onclick={() => onclose?.()}>Fertig</button>
  </div>
</Modal>

<style>
  .field label,
  .types-head .caption {
    text-transform: none;
    letter-spacing: 0;
  }
  .row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .field {
    min-width: 0;
  }
  .types {
    margin-top: 6px;
  }
  .types-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .types-head .caption {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .type-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
  }
  .color {
    width: 44px;
    height: 38px;
    padding: 3px;
    flex: 0 0 auto;
    cursor: pointer;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 18px;
  }
  @media (max-width: 480px) {
    .row2 {
      grid-template-columns: 1fr;
    }
  }
</style>
