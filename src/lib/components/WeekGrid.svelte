<script>
  import DayCard from "./DayCard.svelte";
  import { DAY_KEYS } from "../seed.js";
  import { isCompleted, swapDays } from "../store.svelte.js";

  let {
    goal,
    selectedDay,
    onselect,
    onedit,
    editMode = false,
    week = {},
    today = "",
    ontoggle,
  } = $props();

  const LONG_PRESS = 350; // ms to hold before a card becomes draggable
  const MOVE_CANCEL = 10; // px of movement that cancels the long-press (scroll)

  let dragKey = $state(null); // card currently being dragged
  let overKey = $state(null); // card under the finger (drop target)

  let ghost = null; // floating clone that follows the finger
  let ghostOffX = 0;
  let ghostOffY = 0;
  let pressTimer = null;
  let pressedKey = null;
  let pressedCard = null;
  let activePointer = null;
  let startX = 0;
  let startY = 0;
  let didDrag = false; // suppress the click that follows a drag

  function keyFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const card = el?.closest?.("[data-daykey]");
    return card?.getAttribute("data-daykey") || null;
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const card = e.target.closest?.("[data-daykey]");
    if (!card) return;
    // ignore presses that start on the check / edit controls
    if (e.target.closest(".check, .edit-dot")) return;
    pressedCard = card;
    pressedKey = card.getAttribute("data-daykey");
    activePointer = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => startDrag(e.clientX, e.clientY), LONG_PRESS);
  }

  function startDrag(x, y) {
    if (!pressedCard) return;
    dragKey = pressedKey;
    overKey = pressedKey;
    const rect = pressedCard.getBoundingClientRect();
    ghost = pressedCard.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghostOffX = x - rect.left;
    ghostOffY = y - rect.top;
    document.body.appendChild(ghost);
    document.body.style.userSelect = "none";
    if (navigator.vibrate) navigator.vibrate(15);
    if (activePointer != null) {
      try {
        pressedCard.setPointerCapture(activePointer);
      } catch {}
    }
  }

  function onPointerMove(e) {
    if (dragKey) {
      e.preventDefault();
      if (ghost) {
        ghost.style.left = `${e.clientX - ghostOffX}px`;
        ghost.style.top = `${e.clientY - ghostOffY}px`;
      }
      // live swap: as the held card moves over another, that card slides into
      // the freed slot immediately; the dragged content follows the finger.
      const k = keyFromPoint(e.clientX, e.clientY);
      if (k && k !== dragKey) {
        swapDays(goal.id, dragKey, k);
        dragKey = k;
      }
      overKey = dragKey;
      return;
    }
    if (pressedKey != null) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > MOVE_CANCEL || dy > MOVE_CANCEL) cancelPress();
    }
  }

  function onPointerUp(e) {
    if (dragKey) {
      e.preventDefault();
      // swaps already happened live during the move; just finish up
      didDrag = true;
      setTimeout(() => (didDrag = false), 0);
      endDrag();
    } else {
      cancelPress();
    }
  }

  function cancelPress() {
    clearTimeout(pressTimer);
    pressTimer = null;
    pressedKey = null;
    pressedCard = null;
  }

  function endDrag() {
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    document.body.style.userSelect = "";
    dragKey = null;
    overKey = null;
    cancelPress();
  }

  // swallow the click that fires right after a drag so it doesn't select a day
  function onClickCapture(e) {
    if (didDrag) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
</script>

<div
  class="mb-[22px] grid grid-cols-7 gap-3 max-[860px]:grid-cols-4 max-[560px]:grid-cols-2 max-[560px]:gap-2.5"
  role="presentation"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={endDrag}
  onclickcapture={onClickCapture}
  oncontextmenu={(e) => dragKey && e.preventDefault()}
>
  {#each DAY_KEYS as key (key)}
    <DayCard
      {goal}
      dayKey={key}
      selected={selectedDay === key}
      {onselect}
      {onedit}
      {editMode}
      weekDate={week[key]}
      isToday={week[key] === today}
      completed={isCompleted(goal, week[key])}
      {ontoggle}
      dragging={dragKey === key}
      dropTarget={dragKey != null && overKey === key && overKey !== dragKey}
    />
  {/each}
</div>

<style>
  /* Styles a node cloned imperatively in JS (ghost.classList.add("drag-ghost")),
     so it must stay global — Tailwind utilities can't reach the cloned element. */
  :global(.drag-ghost) {
    position: fixed;
    z-index: 1200;
    margin: 0;
    pointer-events: none;
    opacity: 0.95;
    transform: scale(1.04);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
    border-color: var(--accent) !important;
  }
</style>
