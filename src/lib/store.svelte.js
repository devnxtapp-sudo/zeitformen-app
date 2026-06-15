import { kvGet, kvSet, kvDel } from "./db.js";
import { api } from "./api.js";
import { emptyGoal, goalFromSport, uid, DAY_KEYS } from "./seed.js";
import { dayKeyOf, logKey } from "./dateutil.js";

// Central reactive app state (Svelte 5 runes, shared across components).
export const state = $state({
  goals: [],
  measurements: [], // user-level body-analysis entries (Körperanalyse), not goal-scoped
  nutrition: emptyNutrition(), // user-level nutrition plan (Ernährungsplan), not goal-scoped
  raceNutrition: emptyRaceNutrition(), // race-day fuelling strategy (Nutrition-Strategie)
  packlist: emptyPacklist(), // race-day packing checklist (Packliste)
  activeGoalId: null,
  selectedDay: "mo",
  editMode: false,
  view: "dashboard", // 'dashboard' | 'week' | 'calendar' | 'stats' | 'body' | 'nutrition'
  loaded: false,
});

// Default shape for the nutrition plan: a single set of daily macro targets plus
// a per-date map of logged meals. Kept open so new fields need no migration.
function emptyNutrition() {
  return { targets: { kcal: "", protein: "", carbs: "", fat: "" }, days: {} };
}

// Default shape for the race-day nutrition strategy: race meta + an ordered list
// of phases (pre-start, bike, run, …), each holding fuelling items. Open shape so
// new per-item fields need no migration.
function emptyRacePhase(name = "Neue Phase") {
  return { id: uid(), name, durationH: "", items: [] };
}
function emptyRaceNutrition() {
  return {
    raceName: "",
    targetGph: "",
    durationH: "",
    phases: [
      emptyRacePhase("Vor dem Start"),
      emptyRacePhase("Rad"),
      emptyRacePhase("Lauf"),
    ],
  };
}

// Default packing checklist: a sensible triathlon/HYROX starter list grouped by
// category. Items are { id, label, done }. Users can edit/add/remove freely.
function packCat(name, labels) {
  return {
    id: uid(),
    name,
    items: labels.map((label) => ({ id: uid(), label, done: false })),
  };
}
function emptyPacklist() {
  return {
    raceName: "",
    categories: [
      packCat("Dokumente", [
        "Startnummer / QR-Code",
        "Ausweis / Lizenz",
        "Wettkampfbestätigung",
      ]),
      packCat("Kleidung", ["Wechselkleidung", "Tri-Suit", "After-Race Kleidung"]),
      packCat("Equipment", [
        "Handy",
        "Uhr geladen",
        "Neoprenanzug falls erlaubt",
        "Schwimmbrille",
        "Badekappe",
        "Helm",
        "Laufschuhe",
        "Startnummernband",
      ]),
      packCat("Verpflegung", ["Gels", "Getränke / Mix", "Riegel", "Wasserflasche"]),
    ],
  };
}

// ---- sync versioning ----
// localMtime bumps on every local goal-data change; it is the canonical local
// version. serverUpdatedAt is the server timestamp of our last successful sync.
// Last-write-wins is decided by comparing these timestamps.
let syncEnabled = false;
let localMtime = 0;
let serverUpdatedAt = 0;
let pushTimer = null;

export function setSyncEnabled(on) {
  syncEnabled = on;
}

// Wipe all locally cached data + sync metadata. Called on logout so that a
// different account signing in on the same device cannot inherit or push the
// previous user's data (multi-user shared-device safety).
export async function clearLocal() {
  syncEnabled = false;
  clearTimeout(saveTimer);
  clearTimeout(pushTimer);
  localMtime = 0;
  serverUpdatedAt = 0;
  state.goals = [];
  state.measurements = [];
  state.nutrition = emptyNutrition();
  state.raceNutrition = emptyRaceNutrition();
  state.packlist = emptyPacklist();
  state.activeGoalId = null;
  state.selectedDay = "mo";
  state.view = "dashboard";
  state.editMode = false;
  await Promise.all([
    kvDel("goals"),
    kvDel("measurements"),
    kvDel("nutrition"),
    kvDel("raceNutrition"),
    kvDel("packlist"),
    kvDel("settings"),
    kvDel("sync"),
  ]);
}

function snapshotGoals() {
  return JSON.parse(JSON.stringify(state.goals));
}

function snapshotMeasurements() {
  return JSON.parse(JSON.stringify(state.measurements));
}

// Guarantee every entry has a stable id so keyed {#each} blocks in the UI never
// collide on undefined/duplicate keys (legacy/synced data may predate ids).
function normalizeMeasurements(arr) {
  return Array.isArray(arr) ? arr.map((e) => ({ ...e, id: e.id || uid() })) : [];
}

function snapshotNutrition() {
  return JSON.parse(JSON.stringify(state.nutrition));
}

// Coerce a loaded/synced value into a well-formed nutrition object so the UI can
// rely on targets/days existing without per-read guards (backward-compatible).
function normalizeNutrition(n) {
  const base = emptyNutrition();
  if (!n || typeof n !== "object") return base;
  const days = {};
  if (n.days && typeof n.days === "object") {
    for (const [date, day] of Object.entries(n.days)) {
      days[date] = {
        meals: Array.isArray(day?.meals)
          ? day.meals.map((m) => ({ ...m, id: m.id || uid() }))
          : [],
      };
    }
  }
  return {
    targets: { ...base.targets, ...(n.targets || {}) },
    days,
  };
}

function snapshotRaceNutrition() {
  return JSON.parse(JSON.stringify(state.raceNutrition));
}

// Older clients / fresh accounts may have no race strategy yet; ensure the
// expected shape so the UI can render without per-read guards.
function normalizeRaceNutrition(r) {
  if (!r || typeof r !== "object") return emptyRaceNutrition();
  return {
    raceName: r.raceName || "",
    targetGph: r.targetGph ?? "",
    durationH: r.durationH ?? "",
    phases: Array.isArray(r.phases)
      ? r.phases.map((p) => ({
          id: p.id || uid(),
          name: p.name || "Phase",
          durationH: p.durationH ?? "",
          items: Array.isArray(p.items)
            ? p.items.map((it) => ({ ...it, id: it.id || uid() }))
            : [],
        }))
      : [],
  };
}

function snapshotPacklist() {
  return JSON.parse(JSON.stringify(state.packlist));
}

// Missing value (fresh/old account) -> seed the default starter list. A present
// value with an empty categories array is respected (user cleared it).
function normalizePacklist(p) {
  if (!p || typeof p !== "object" || !Array.isArray(p.categories)) {
    return emptyPacklist();
  }
  return {
    raceName: p.raceName || "",
    categories: p.categories.map((c) => ({
      id: c.id || uid(),
      name: c.name || "Kategorie",
      items: Array.isArray(c.items)
        ? c.items.map((it) => ({
            id: it.id || uid(),
            label: it.label || "",
            done: !!it.done,
          }))
        : [],
    })),
  };
}

function saveSyncMeta() {
  return kvSet("sync", { localMtime, serverUpdatedAt });
}

let saveTimer = null;
// `dataChanged` = goal content changed (vs. UI-only settings like view/day).
function persist(dataChanged = false) {
  if (dataChanged) localMtime = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    kvSet("goals", snapshotGoals());
    kvSet("measurements", snapshotMeasurements());
    kvSet("nutrition", snapshotNutrition());
    kvSet("raceNutrition", snapshotRaceNutrition());
    kvSet("packlist", snapshotPacklist());
    kvSet("settings", {
      activeGoalId: state.activeGoalId,
      selectedDay: state.selectedDay,
      view: state.view,
    });
    if (dataChanged) saveSyncMeta();
  }, 150);
  if (dataChanged) schedulePush();
}

function schedulePush() {
  if (!syncEnabled) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushNow();
  }, 1200);
}

// Convert legacy boolean log entries into rich snapshot objects, ensure log exists.
function migrateGoals() {
  for (const g of state.goals) {
    // Backward-compat: every day gains an (empty) extraSessions list so the
    // multi-session UI/logging can rely on it without per-read guards.
    for (const key of Object.keys(g.days || {})) {
      if (!Array.isArray(g.days[key].extraSessions)) {
        g.days[key].extraSessions = [];
      }
    }
    if (!g.log) g.log = {};
    for (const [date, val] of Object.entries(g.log)) {
      if (val === true) {
        const dk = dayKeyOf(date);
        const t = typeById(g, g.days[dk]?.typeId);
        g.log[date] = {
          done: true,
          dayKey: dk,
          typeId: t?.id ?? null,
          typeLabel: t?.label ?? "",
          typeColor: t?.color ?? "#9aa0a6",
          title: g.days[dk]?.title ?? "",
          note: "",
          metrics: {},
        };
      }
    }
  }
}

// ---- one-time content migration ----
// Seed changes don't reach goals that are already persisted/synced. Bump
// CONTENT_VERSION and add cases here to push refreshed plan text into existing
// goals exactly once (guarded per goal, and only when the slot still matches the
// known title so user-renamed days are left untouched).
const CONTENT_VERSION = 2;

const HYROX_SESSIONS = {
  mo: {
    title: "Grundlagenausdauer",
    blocks: [
      {
        title: "Info",
        items: [
          "Laufen vs. SkiErg/RowErg: Beim Laufen kommen die passiven Strukturen nicht so schnell hinterher – vor allem, wenn ich mehr und mehr Volumen ansammle = viel Belastung auf Kniegelenke, Sprunggelenke, Hüfte usw.",
          "Deshalb die Grundlagen-Session mit SkiErg/RowErg, Bike oder Crosstrainer.",
        ],
      },
      {
        title: "Inhalt",
        items: [
          "Lockerer Dauerlauf oder Rad im Zone-2-Bereich",
          "Gleichmäßiges Tempo, Nasenatmung möglich",
          "Optional als Brick mit kurzer Lauf-Abschlusseinheit",
        ],
      },
      {
        title: "Mögliche Trainingsmethoden",
        items: ["mindestens 60–120 min eine Session"],
      },
    ],
  },
  di: {
    title: "Threshold-Training",
    blocks: [
      {
        title: "Info",
        items: [
          "Threshold-Training (Runs, Bike, Ski usw.) – key performance driver: Wie gut kann ich Laktat abbauen!",
          "Zone-3-Training, 80–85 % max. HF. In diesem Bereich wird sich der HYROX-Race abspielen.",
          "Wichtig: Im Laufe des Trainings driftet die HF nach oben ab, weil das Herz-Kreislauf-System noch nicht so gut adaptiert/aufgebaut ist. Deswegen ist es unglaublich wichtig, den Grundlagenbereich aufzubauen, damit man die Threshold-Session möglichst gut machen kann.",
        ],
      },
      {
        title: "Trainingsmethoden",
        items: [
          "4×2 km Run, 75 sec Pause dazwischen",
          "2×5 km, 2 min Pause",
          "3×15 min, 2 min Pause",
          "Tempodauerlauf über 40 min",
          "Bike-Session 40 min",
          "RowErg 40 min, SkiErg 40 min",
        ],
      },
    ],
  },
  fr: {
    title: "VO₂max-Intervalle",
    blocks: [
      {
        title: "Trainingsmethoden",
        items: [
          "6–8×1 km Run, 1 bis max. 1,5 min Pause dazwischen",
          "6×3 min Bike, 1 bis max. 1,5 min Pause dazwischen",
          "6–8×1 km RowErg, 1 bis max. 1,5 min Pause dazwischen",
        ],
      },
    ],
  },
};

function migrateContent() {
  let changed = false;
  for (const g of state.goals) {
    // Match purely by the distinctive day titles, not sportId — goals created
    // from the HYROX preset can carry sportId "custom" once edited/renamed.
    if ((g._contentV || 0) >= CONTENT_VERSION) continue;
    let goalChanged = false;
    for (const [dayKey, spec] of Object.entries(HYROX_SESSIONS)) {
      const day = g.days?.[dayKey];
      if (day?.session && day.title === spec.title) {
        day.session.blocks = JSON.parse(JSON.stringify(spec.blocks));
        goalChanged = true;
      }
    }
    // Only stamp the version when a day actually matched — otherwise a goal whose
    // titles didn't line up yet would be marked "migrated" and never retried.
    if (goalChanged) {
      g._contentV = CONTENT_VERSION;
      changed = true;
    }
  }
  return changed;
}

function ensureActiveGoal() {
  if (!state.goals.some((g) => g.id === state.activeGoalId)) {
    state.activeGoalId = state.goals[0]?.id || null;
  }
}

export async function loadState() {
  const [
    goals,
    measurements,
    nutrition,
    raceNutrition,
    packlist,
    settings,
    sync,
  ] = await Promise.all([
    kvGet("goals"),
    kvGet("measurements"),
    kvGet("nutrition"),
    kvGet("raceNutrition"),
    kvGet("packlist"),
    kvGet("settings"),
    kvGet("sync"),
  ]);

  // No demo seeding: a fresh/new user starts with no goals and sees the
  // "+ Training" empty home until they create their first training.
  state.goals = goals && goals.length ? goals : [];

  state.measurements = normalizeMeasurements(measurements);
  state.nutrition = normalizeNutrition(nutrition);
  state.raceNutrition = normalizeRaceNutrition(raceNutrition);
  state.packlist = normalizePacklist(packlist);

  migrateGoals();
  const contentChanged = migrateContent();

  if (sync) {
    localMtime = sync.localMtime || 0;
    serverUpdatedAt = sync.serverUpdatedAt || 0;
  }

  state.activeGoalId =
    (settings && settings.activeGoalId) || state.goals[0]?.id || null;
  ensureActiveGoal();
  state.selectedDay = (settings && settings.selectedDay) || "mo";
  // The dashboard is the home/landing view — always start there on load,
  // regardless of which subpage was open when the app was last closed.
  state.view = "dashboard";
  state.loaded = true;

  if (!goals || !goals.length) persist();
  else if (contentChanged) persist(true);
}

// ---- sync orchestration ----
// Pull the server snapshot and reconcile with local (last-write-wins by mtime).
export async function pullAndReconcile() {
  let snap;
  try {
    snap = await api.syncGet();
  } catch {
    return; // offline or not authenticated — keep local
  }
  const serverTs = snap?.updatedAt || 0;

  if (snap?.goals && serverTs > localMtime) {
    // server is newer -> adopt it
    state.goals = snap.goals;
    state.measurements = normalizeMeasurements(snap.measurements);
    state.nutrition = normalizeNutrition(snap.nutrition);
    state.raceNutrition = normalizeRaceNutrition(snap.raceNutrition);
    state.packlist = normalizePacklist(snap.packlist);
    migrateGoals();
    const contentChanged = migrateContent();
    ensureActiveGoal();
    localMtime = serverTs;
    serverUpdatedAt = serverTs;
    await Promise.all([
      kvSet("goals", snapshotGoals()),
      kvSet("measurements", snapshotMeasurements()),
      kvSet("nutrition", snapshotNutrition()),
      kvSet("raceNutrition", snapshotRaceNutrition()),
      kvSet("packlist", snapshotPacklist()),
      saveSyncMeta(),
    ]);
    // adopted server data was on an older content version -> push the refresh up
    if (contentChanged) await pushNow();
  } else if (localMtime > serverTs) {
    // local is newer (or server empty) -> push local up
    await pushNow();
  } else {
    serverUpdatedAt = serverTs;
    await saveSyncMeta();
  }
}

export async function pushNow() {
  if (!syncEnabled) return;
  try {
    const { updatedAt } = await api.syncPut(
      snapshotGoals(),
      snapshotMeasurements(),
      snapshotNutrition(),
      snapshotRaceNutrition(),
      snapshotPacklist(),
    );
    serverUpdatedAt = updatedAt;
    localMtime = updatedAt; // align local version with the server's timestamp
    await saveSyncMeta();
  } catch {
    // offline/auth error: localMtime stays ahead so we retry on next change/start
  }
}

// ---- selectors ----
export function activeGoal() {
  return state.goals.find((g) => g.id === state.activeGoalId) || null;
}

export function typeById(goal, id) {
  if (!goal || !id) return null;
  return goal.types.find((t) => t.id === id) || null;
}

// ---- mutations (UI/settings — no data sync) ----
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

export function setView(v) {
  state.view = v;
  persist();
}

// ---- mutations (goal data — synced) ----
export function addGoal(name) {
  const g = emptyGoal(name || "Neues Trainingsziel");
  state.goals.push(g);
  state.activeGoalId = g.id;
  persist(true);
  return g;
}

// Create a new goal pre-filled from a sport preset and make it active.
export function addGoalFromSport(sport, name) {
  const g = goalFromSport(sport, name);
  state.goals.push(g);
  state.activeGoalId = g.id;
  persist(true);
  return g;
}

// Add an already-built goal object (e.g. from the setup wizard) and activate it.
export function addPreparedGoal(goal) {
  state.goals.push(goal);
  state.activeGoalId = goal.id;
  persist(true);
  return goal;
}

export function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  if (state.activeGoalId === id) {
    state.activeGoalId = state.goals[0]?.id || null;
  }
  persist(true);
}

export function updateGoalMeta(id, patch) {
  const g = state.goals.find((x) => x.id === id);
  if (!g) return;
  Object.assign(g, patch);
  persist(true);
}

export function updateDay(goalId, dayKey, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  Object.assign(g.days[dayKey], patch);
  persist(true);
}

// Swap the training content of two weekdays (drag-and-drop reorder). The day
// objects hold no internal day key, so swapping them simply moves the training
// to the other slot; completion log is keyed by calendar date and untouched.
export function swapDays(goalId, keyA, keyB) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g || keyA === keyB) return;
  const tmp = g.days[keyA];
  g.days[keyA] = g.days[keyB];
  g.days[keyB] = tmp;
  persist(true);
}

// ---- training types ----
export function addType(goalId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.types.push({ id: uid(), label: "Neuer Typ", color: "#5b8def" });
  persist(true);
}

export function updateType(goalId, typeId, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  const t = g?.types.find((x) => x.id === typeId);
  if (!t) return;
  Object.assign(t, patch);
  persist(true);
}

export function deleteType(goalId, typeId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.types = g.types.filter((t) => t.id !== typeId);
  for (const key of Object.keys(g.days)) {
    if (g.days[key].typeId === typeId) g.days[key].typeId = null;
  }
  persist(true);
}

// ---- notes ----
export function addNote(goalId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.notes.push({ id: uid(), title: "Neuer Hinweis", body: "" });
  persist(true);
}

export function updateNote(goalId, noteId, patch) {
  const g = state.goals.find((x) => x.id === goalId);
  const n = g?.notes.find((x) => x.id === noteId);
  if (!n) return;
  Object.assign(n, patch);
  persist(true);
}

export function deleteNote(goalId, noteId) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  g.notes = g.notes.filter((n) => n.id !== noteId);
  persist(true);
}

// ---- completion log ----
// Completions are keyed by the real calendar date (YYYY-MM-DD), so the plan
// template (MO–SO) accumulates a real history across weeks. Each entry snapshots
// the training type at completion time so stats stay correct if the plan changes.
// The session object for a given day + slot. slot 0 = the primary day fields,
// slot n>0 = the n-th extra session (Doppelsession). Returns the field carrier
// (day itself or an extraSessions entry), or null if it doesn't exist.
function sessionAt(g, dayKey, slot = 0) {
  const day = g?.days?.[dayKey];
  if (!day) return null;
  if (!slot) return day;
  return day.extraSessions?.[slot - 1] || null;
}

export function toggleCompletion(goalId, dateStr, dayKey, slot = 0) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  if (!g.log) g.log = {};
  const key = logKey(dateStr, slot);
  if (g.log[key]) {
    delete g.log[key];
  } else {
    const dk = dayKey || dayKeyOf(dateStr);
    const sess = sessionAt(g, dk, slot);
    const t = typeById(g, sess?.typeId);
    g.log[key] = {
      done: true,
      dayKey: dk,
      slot,
      typeId: t?.id ?? null,
      typeLabel: t?.label ?? "",
      typeColor: t?.color ?? "#9aa0a6",
      title: sess?.title ?? "",
      note: "",
      metrics: {},
    };
  }
  persist(true);
}

export function isCompleted(goal, dateStr, slot = 0) {
  return !!(goal && goal.log && goal.log[logKey(dateStr, slot)]);
}

export function logEntry(goal, dateStr, slot = 0) {
  return (goal && goal.log && goal.log[logKey(dateStr, slot)]) || null;
}

// Update note/metrics on an existing entry (creates one if missing).
export function updateLogEntry(goalId, dateStr, patch, dayKey, slot = 0) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return;
  if (!g.log) g.log = {};
  const key = logKey(dateStr, slot);
  if (!g.log[key]) {
    toggleCompletion(goalId, dateStr, dayKey, slot);
  }
  const entry = g.log[key];
  if (!entry) return;
  if (patch.metrics) {
    entry.metrics = { ...entry.metrics, ...patch.metrics };
    delete patch.metrics;
  }
  Object.assign(entry, patch);
  persist(true);
}

// ---- body analysis (Körperanalyse) ----
// User-level body-composition entries (e.g. InBody readings). Each entry holds a
// date plus an open metrics map, so new metrics can be added without migrations.
export function addMeasurement(entry) {
  const m = {
    id: uid(),
    date: entry?.date || new Date().toISOString().slice(0, 10),
    metrics: { ...(entry?.metrics || {}) },
    note: entry?.note || "",
  };
  state.measurements.push(m);
  persist(true);
  return m;
}

export function updateMeasurement(id, patch) {
  const m = state.measurements.find((x) => x.id === id);
  if (!m) return;
  if (patch.metrics) {
    m.metrics = { ...m.metrics, ...patch.metrics };
    delete patch.metrics;
  }
  Object.assign(m, patch);
  persist(true);
}

export function deleteMeasurement(id) {
  state.measurements = state.measurements.filter((m) => m.id !== id);
  persist(true);
}

// ---- nutrition plan (Ernährungsplan) ----
// User-level macro targets + per-day meals. Targets are a single shared object;
// meals are keyed by ISO date so each day has its own list.
export function setNutritionTargets(patch) {
  state.nutrition.targets = { ...state.nutrition.targets, ...patch };
  persist(true);
}

function nutritionDay(date) {
  if (!state.nutrition.days[date]) {
    state.nutrition.days[date] = { meals: [] };
  }
  return state.nutrition.days[date];
}

export function addMeal(date, meal) {
  const m = {
    id: uid(),
    name: meal?.name || "Mahlzeit",
    kcal: meal?.kcal ?? "",
    protein: meal?.protein ?? "",
    carbs: meal?.carbs ?? "",
    fat: meal?.fat ?? "",
  };
  nutritionDay(date).meals.push(m);
  persist(true);
  return m;
}

export function updateMeal(date, id, patch) {
  const day = state.nutrition.days[date];
  const m = day?.meals.find((x) => x.id === id);
  if (!m) return;
  Object.assign(m, patch);
  persist(true);
}

export function deleteMeal(date, id) {
  const day = state.nutrition.days[date];
  if (!day) return;
  day.meals = day.meals.filter((m) => m.id !== id);
  persist(true);
}

// ---- race-day nutrition strategy (Nutrition-Strategie) ----
export function setRaceMeta(patch) {
  Object.assign(state.raceNutrition, patch);
  persist(true);
}

export function addRacePhase(name) {
  const p = emptyRacePhase(name || "Neue Phase");
  state.raceNutrition.phases.push(p);
  persist(true);
  return p;
}

export function updateRacePhase(id, patch) {
  const p = state.raceNutrition.phases.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  persist(true);
}

export function deleteRacePhase(id) {
  state.raceNutrition.phases = state.raceNutrition.phases.filter(
    (p) => p.id !== id,
  );
  persist(true);
}

export function addRaceItem(phaseId, item) {
  const p = state.raceNutrition.phases.find((x) => x.id === phaseId);
  if (!p) return;
  const it = {
    id: uid(),
    qty: item?.qty ?? 1,
    name: item?.name || "",
    type: item?.type || "",
    carbsG: item?.carbsG ?? "",
    fluidMl: item?.fluidMl ?? "",
    sodiumMg: item?.sodiumMg ?? "",
    caffeineMg: item?.caffeineMg ?? "",
  };
  p.items.push(it);
  persist(true);
  return it;
}

export function updateRaceItem(phaseId, id, patch) {
  const p = state.raceNutrition.phases.find((x) => x.id === phaseId);
  const it = p?.items.find((x) => x.id === id);
  if (!it) return;
  Object.assign(it, patch);
  persist(true);
}

export function deleteRaceItem(phaseId, id) {
  const p = state.raceNutrition.phases.find((x) => x.id === phaseId);
  if (!p) return;
  p.items = p.items.filter((it) => it.id !== id);
  persist(true);
}

// ---- race-day packing checklist (Packliste) ----
export function setPacklistMeta(patch) {
  Object.assign(state.packlist, patch);
  persist(true);
}

export function addPacklistCategory(name) {
  const c = { id: uid(), name: name || "Neue Kategorie", items: [] };
  state.packlist.categories.push(c);
  persist(true);
  return c;
}

export function updatePacklistCategory(id, patch) {
  const c = state.packlist.categories.find((x) => x.id === id);
  if (!c) return;
  Object.assign(c, patch);
  persist(true);
}

export function deletePacklistCategory(id) {
  state.packlist.categories = state.packlist.categories.filter(
    (c) => c.id !== id,
  );
  persist(true);
}

export function addPacklistItem(catId, label) {
  const c = state.packlist.categories.find((x) => x.id === catId);
  if (!c) return;
  const it = { id: uid(), label: label || "", done: false };
  c.items.push(it);
  persist(true);
  return it;
}

export function updatePacklistItem(catId, id, patch) {
  const c = state.packlist.categories.find((x) => x.id === catId);
  const it = c?.items.find((x) => x.id === id);
  if (!it) return;
  Object.assign(it, patch);
  persist(true);
}

export function togglePacklistItem(catId, id) {
  const c = state.packlist.categories.find((x) => x.id === catId);
  const it = c?.items.find((x) => x.id === id);
  if (!it) return;
  it.done = !it.done;
  persist(true);
}

export function deletePacklistItem(catId, id) {
  const c = state.packlist.categories.find((x) => x.id === catId);
  if (!c) return;
  c.items = c.items.filter((it) => it.id !== id);
  persist(true);
}

export function persistNow() {
  persist(true);
}
