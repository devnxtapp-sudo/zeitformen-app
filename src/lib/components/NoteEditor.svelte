<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import { updateNote } from "../store.svelte.js";

  let { goal, noteId, onclose } = $props();

  // one-time snapshot of the note being edited
  let draft = $state(
    untrack(() => {
      const n = goal.notes.find((x) => x.id === noteId);
      return { title: n.title, body: n.body };
    }),
  );

  function save() {
    updateNote(goal.id, noteId, draft);
    onclose?.();
  }
</script>

<Modal title="Hinweis bearbeiten" {onclose}>
  <div class="field">
    <label for="n-title">Titel</label>
    <input id="n-title" bind:value={draft.title} />
  </div>
  <div class="field">
    <label for="n-body">Text</label>
    <textarea id="n-body" bind:value={draft.body} rows="6"></textarea>
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
