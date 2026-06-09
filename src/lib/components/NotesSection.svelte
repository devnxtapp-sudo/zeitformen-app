<script>
  import Accordion from "./Accordion.svelte";
  import { addNote, deleteNote } from "../store.svelte.js";

  let { goal, editMode = false, oneditnote } = $props();
</script>

<div class="notes">
  <div class="section-head">
    <h3 class="section-title">Hinweise & Periodisierung</h3>
    {#if editMode}
      <button class="btn btn-sm" onclick={() => addNote(goal.id)}>+ Hinweis</button>
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
    <p class="empty muted">Noch keine Hinweise.</p>
  {/if}
</div>

<style>
  .notes {
    margin-top: 26px;
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .empty {
    font-size: 14px;
  }
</style>
