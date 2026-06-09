<script>
  import Modal from "./Modal.svelte";
  import { updateNote } from "../store.svelte.js";

  let { goal, noteId, onclose } = $props();

  let note = goal.notes.find((n) => n.id === noteId);
  let draft = $state({ title: note.title, body: note.body });

  function save() {
    updateNote(goal.id, noteId, draft);
    onclose?.();
  }
</script>

<Modal title="Hinweis bearbeiten" {onclose}>
  <div class="field">
    <label>Titel</label>
    <input bind:value={draft.title} />
  </div>
  <div class="field">
    <label>Text</label>
    <textarea bind:value={draft.body} rows="6"></textarea>
  </div>
  <div class="actions">
    <button class="btn btn-ghost" onclick={() => onclose?.()}>Abbrechen</button>
    <button class="btn btn-primary" onclick={save}>Speichern</button>
  </div>
</Modal>

<style>
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }
</style>
