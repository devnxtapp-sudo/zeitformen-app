<script>
  import Accordion from "./Accordion.svelte";
  import { addNote, deleteNote } from "../store.svelte.js";
  import { Button } from "flowbite-svelte";

  let { goal, editMode = false, oneditnote } = $props();
</script>

<div class="mt-[26px]">
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-xs font-bold uppercase tracking-wide text-ink-muted">
      Hinweise &amp; Periodisierung
    </h3>
    {#if editMode}
      <Button
        size="sm"
        color="alternative"
        class="border-transparent bg-transparent text-primary-400 hover:text-primary-500"
        onclick={() => addNote(goal.id)}>+ Hinweis</Button
      >
    {/if}
  </div>

  {#each goal.notes as note (note.id)}
    <Accordion
      title={note.title}
      {editMode}
      onedit={() => oneditnote?.(note.id)}
      ondelete={() => deleteNote(goal.id, note.id)}
    >
      {note.body}
    </Accordion>
  {/each}

  {#if !goal.notes.length}
    <p class="text-sm text-ink-muted">Noch keine Hinweise.</p>
  {/if}
</div>
