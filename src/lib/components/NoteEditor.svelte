<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import { updateNote } from "../store.svelte.js";
  import { Button, Input, Label, Textarea } from "flowbite-svelte";

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
  <div class="mb-3.5">
    <Label for="n-title" class="mb-1.5 block text-xs font-semibold text-ink-muted">Titel</Label>
    <Input id="n-title" bind:value={draft.title} />
  </div>
  <div class="mb-3.5">
    <Label for="n-body" class="mb-1.5 block text-xs font-semibold text-ink-muted">Text</Label>
    <Textarea id="n-body" bind:value={draft.body} rows={6} />
  </div>
  <div class="mt-2 flex justify-end gap-2.5">
    <Button color="alternative" onclick={() => onclose?.()}>Abbrechen</Button>
    <Button color="primary" class="font-semibold text-[var(--on-accent)]" onclick={save}>Speichern</Button>
  </div>
</Modal>
