<script>
  import Modal from "./Modal.svelte";
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

  function confirmDelete() {
    if (confirm(`Trainingsziel „${goal.name}" wirklich löschen?`)) {
      deleteGoal(goal.id);
      onclose?.();
    }
  }
</script>

<Modal title="Trainingsziel bearbeiten" {onclose}>
  <div class="field">
    <label>Name</label>
    <input value={goal.name} oninput={(e) => patch("name", e.target.value)} />
  </div>

  <div class="row2">
    <div class="field">
      <label>Sportart / Event</label>
      <input
        value={goal.sport}
        oninput={(e) => patch("sport", e.target.value)}
        placeholder="z.B. HYROX"
      />
    </div>
    <div class="field">
      <label>Zieldatum</label>
      <input
        type="date"
        value={goal.targetDate}
        oninput={(e) => patch("targetDate", e.target.value)}
      />
    </div>
  </div>

  <div class="field">
    <label>Beschreibung</label>
    <textarea
      value={goal.description}
      oninput={(e) => patch("description", e.target.value)}
    ></textarea>
  </div>

  <div class="field">
    <label>Fußnote (unter dem Wochenplan)</label>
    <textarea
      value={goal.footerNote}
      oninput={(e) => patch("footerNote", e.target.value)}
    ></textarea>
  </div>

  <div class="types">
    <div class="types-head">
      <label>Trainingstypen</label>
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
  .types-head label {
    text-transform: none;
    letter-spacing: 0;
  }
  .row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
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
  .types-head label {
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
