import { kvGet, kvSet } from "./db.js";
import { seedGoals, emptyGoal, uid } from "./seed.js";

// Central reactive app state (Svelte 5 runes, shared across components).
export const state = $state({
  goals: [],
  activeGoalId: null,
  selectedDay: "mo",
  editMode: false,
  loaded: false,
});

let saveTimer = null;
function persist() {
  // debounce writes to IndexedDB
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    kvSet("goals", JSON.parse(JSON.stringify(state.goals)));
    kvSet("settings", {
      activeGoalId: state.activeGoalId,
      selectedDay: state.selectedDay,
    });
  }, 150);
}

export async function loadState() {
  const [goals, settings] = await Promise.all([
    kvGet("goals"),
    kvGet("settings"),
  ]);

  if (goals && goals.length) {
    state.goals = goals;
  } else {
    state.goals = seedGoals();
  }

  state.activeGoalId =
    (settings && settings.activeGoalId) || state.goals[0]?.id || null;
  // ensure activeGoalId still exists
  if (!state.goals.some((g) => g.id === state.activeGoalId)) {
    state.activeGoalId = state.goals[0]?.id || null;
  }
  state.selectedDay = (settings && settings.selectedDay) || "mo";
  state.loaded = true;

  if (!goals || !goals.length) persist();
}

// ---- selectors ----
export function activeGoal() {
  return state.goals.find((g) => g.id === state.activeGoalId) || null;
}

export function typeById(goal, id) {
  if (!goal || !id) return null;
  return goal.types.find((t) => t.id === id) || null;
}

// ---- mutations (all persist) ----
export function setActiveGoal(id) {
  state.activeGoalId = id;
  persist();
}

export function selectDay(key) {
  state.selectedDay = key;
  persist();
}

export function toggleEdit() {
  state.editMode = !state.editMode;
}

export function addGoal(name) {
  const g = emptyGoal(name || "Neues Trainingsziel");
  state.goals.push(g);
  state.activeGoalId = g.id;
  persist();
  return g;
}

export function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  if (state.activeGoalId === id) {
    state.activeGoalId = state.goals[0]?.id || null;
  }
  persist();
}

export function updateGoalMeta(id, patch) {
  const g = state.goals.find((x) => x.id === id);
  if (!g) return;
  Object.assign(g, patch);
  persist();
}

export function updateDay(goalId, dayKey, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  Object.assign(g.days[dayKey], patch);
  persist();
}

// ---- training types ----
export function addType(goalId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.types.push({ id: uid(), label: "Neuer Typ", color: "#5b8def" });
  persist();
}

export function updateType(goalId, typeId, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  const t = g?.types.find((x) => x.id === typeId);
  if (!t) return;
  Object.assign(t, patch);
  persist();
}

export function deleteType(goalId, typeId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.types = g.types.filter((t) => t.id !== typeId);
  // unset type on any days using it
  for (const key of Object.keys(g.days)) {
    if (g.days[key].typeId === typeId) g.days[key].typeId = null;
  }
  persist();
}

// ---- notes ----
export function addNote(goalId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.notes.push({ id: uid(), title: "Neuer Hinweis", body: "" });
  persist();
}

export function updateNote(goalId, noteId, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  const n = g?.notes.find((x) => x.id === noteId);
  if (!n) return;
  Object.assign(n, patch);
  persist();
}

export function deleteNote(goalId, noteId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.notes = g.notes.filter((n) => n.id !== noteId);
  persist();
}

export function persistNow() {
  persist();
}
