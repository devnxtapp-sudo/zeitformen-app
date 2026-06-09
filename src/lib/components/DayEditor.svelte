<script>
  import Modal from "./Modal.svelte";
  import { DAY_LABELS } from "../seed.js";
  import { updateDay } from "../store.svelte.js";

  let { goal, dayKey, onclose } = $props();

  // deep copy so edits are only committed on save
  let draft = $state(JSON.parse(JSON.stringify(goal.days[dayKey])));

  function addBlock() {
    draft.session.blocks.push({ title: "", items: [""] });
  }
  function removeBlock(i) {
    draft.session.blocks.splice(i, 1);
  }
  function addItem(bi) {
    draft.session.blocks[bi].items.push("");
  }
  function removeItem(bi, ii) {
    draft.session.blocks[bi].items.splice(ii, 1);
  }

  function save() {
    // clean empty items
    for (const b of draft.session.blocks) {
      b.items = b.items.filter((x) => x.trim() !== "");
    }
    draft.session.blocks = draft.session.blocks.filter(
      (b) => b.title.trim() !== "" || b.items.length,
    );
    updateDay(goal.id, dayKey, draft);
    onclose?.();
  }
</script>

<Modal title={`${DAY_LABELS[dayKey]} bearbeiten`} {onclose}>
  <div class="field">
    <label for="rest">
      <input id="rest" type="checkbox" bind:checked={draft.isRest} class="cb" />
      Ruhetag
    </label>
  </div>

  {#if !draft.isRest}
    <div class="field">
      <label>Trainingstyp</label>
      <select bind:value={draft.typeId}>
        <option value={null}>— kein Typ —</option>
        {#each goal.types as t (t.id)}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="field">
    <label>Titel</label>
    <input bind:value={draft.title} placeholder="z.B. Grundlagenausdauer" />
  </div>

  <div class="field">
    <label>Untertitel / Dauer</label>
    <input bind:value={draft.meta} placeholder="z.B. 60–120 min · 60–65 % HFmax" />
  </div>

  {#if !draft.isRest}
    <div class="field">
      <label>Ziel</label>
      <textarea bind:value={draft.session.objective}></textarea>
    </div>

    <div class="blocks">
      <div class="blocks-head">
        <label>Blöcke</label>
        <button class="btn btn-sm" onclick={addBlock}>+ Block</button>
      </div>

      {#each draft.session.blocks as block, bi (bi)}
        <div class="block">
          <div class="block-row">
            <input
              bind:value={block.title}
              placeholder="Blocktitel (z.B. Aufbau einer Einheit)"
            />
            <button class="btn btn-sm btn-danger" onclick={() => removeBlock(bi)}>✕</button>
          </div>
          {#each block.items as _, ii (ii)}
            <div class="item-row">
              <input bind:value={block.items[ii]} placeholder="Punkt …" />
              <button class="btn btn-sm btn-ghost" onclick={() => removeItem(bi, ii)}>✕</button>
            </div>
          {/each}
          <button class="btn btn-sm btn-ghost add-item" onclick={() => addItem(bi)}
            >+ Punkt</button
          >
        </div>
      {/each}
    </div>

    <div class="field" style="margin-top:14px;">
      <label>Bonus / Hinweis</label>
      <textarea bind:value={draft.session.bonus}></textarea>
    </div>
  {/if}

  <div class="actions">
    <button class="btn btn-ghost" onclick={() => onclose?.()}>Abbrechen</button>
    <button class="btn btn-primary" onclick={save}>Speichern</button>
  </div>
</Modal>

<style>
  .cb {
    width: auto;
    margin-right: 8px;
    vertical-align: middle;
  }
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  .blocks-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .blocks-head label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .block {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
    margin-bottom: 10px;
    background: var(--card);
  }
  .block-row,
  .item-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .add-item {
    margin-top: 2px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
</style>
