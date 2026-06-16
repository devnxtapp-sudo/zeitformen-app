// Seed data — the HYROX September plan from the reference design.
// Everything here is fully editable inside the app; this is just the starting state.

export const DAY_KEYS = ["mo", "di", "mi", "do", "fr", "sa", "so"];
export const DAY_LABELS = {
  mo: "MO",
  di: "DI",
  mi: "MI",
  do: "DO",
  fr: "FR",
  sa: "SA",
  so: "SO",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Suggested competition classes (e.g. HYROX). Free text is also allowed.
export const CATEGORY_OPTIONS = [
  "Single",
  "Doubles",
  "Mixed Doubles",
  "Relay",
  "Pro",
];

// ---- training modalities ----
// A session's modality decides which metric fields are relevant – the same
// training type (e.g. "Threshold") can be done running, on the rower or as
// strength work, each with different units. `plan` = fields for prescribing an
// interval, `log` = fields the athlete fills in afterwards.
export const MODALITIES = [
  { id: "run", label: "Laufen", amountUnits: ["km", "m", "min"], plan: ["amount", "rest"], log: ["time", "pace", "hr"] },
  { id: "bike", label: "Rad", amountUnits: ["min", "km"], plan: ["amount", "rest"], log: ["time", "power", "hr"] },
  { id: "row", label: "Rudern", amountUnits: ["m", "km", "min"], plan: ["amount", "rest"], log: ["time", "pace", "hr"] },
  { id: "ski", label: "SkiErg", amountUnits: ["m", "km", "min"], plan: ["amount", "rest"], log: ["time", "pace", "hr"] },
  { id: "swim", label: "Schwimmen", amountUnits: ["m", "min"], plan: ["amount", "rest"], log: ["time", "pace"] },
  { id: "strength", label: "Kraft", amountUnits: ["Wdh"], plan: ["amount", "weight", "rest"], log: ["reps", "weight"] },
  { id: "other", label: "Sonstiges", amountUnits: ["min"], plan: ["amount", "rest"], log: ["time"] },
];

// Metric labels/units shared by plan + log views.
export const METRIC_META = {
  amount: { label: "Menge" },
  rest: { label: "Pause" },
  weight: { label: "kg", unit: "kg" },
  time: { label: "Zeit", placeholder: "mm:ss" },
  pace: { label: "Pace", placeholder: "min/km" },
  power: { label: "Watt", unit: "W" },
  hr: { label: "Puls", unit: "bpm" },
  reps: { label: "Wdh" },
};

export function modalityById(id) {
  return MODALITIES.find((m) => m.id === id) || null;
}

// Human-readable prescription for one interval/exercise, e.g.
// "4 × 2 km · 75 s Pause" or "Bankdrücken: 3 × 12 Wdh @ 60 kg".
export function formatInterval(iv) {
  const repeat = Number(iv.repeat) || 1;
  const parts = [];
  if (String(iv.amount ?? "").trim() !== "") parts.push(`${iv.amount} ${iv.amountUnit}`);
  if (String(iv.weight ?? "").trim() !== "") parts.push(`@ ${iv.weight} kg`);
  let main = parts.join(" ");
  if (repeat > 1) main = main ? `${repeat} × ${main}` : `${repeat} Sätze`;
  if (String(iv.rest ?? "").trim() !== "") main += ` · ${iv.rest} ${iv.restUnit || "s"} Pause`;
  main = main.trim();
  const name = String(iv.name ?? "").trim();
  if (name) return main ? `${name}: ${main}` : name;
  return main;
}

function hyroxGoal() {
  const types = [
    { id: "kraft", label: "Kraft", color: "#f0a830" },
    { id: "zone2", label: "Zone 2", color: "#5fb87a" },
    { id: "threshold", label: "Threshold", color: "#22d3ee" },
    { id: "vo2", label: "VO₂max", color: "#a779e9" },
    { id: "swim", label: "Schwimmen", color: "#9aa0a6" },
  ];

  const days = {
    mo: {
      typeId: "zone2",
      title: "Grundlagenausdauer",
      meta: "60–120 min · 60–65 % HFmax",
      isRest: false,
      session: {
        objective:
          "Aerobe Basis aufbauen – lange, ruhige Einheit im niedrigen Pulsbereich.",
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
            items: [
              "mindestens 60–120 min eine Session",
            ],
          },
        ],
        bonus:
          "Fundament für alle weiteren Belastungen – nicht zu schnell laufen, Disziplin im Pulsbereich.",
      },
    },
    di: {
      typeId: "threshold",
      title: "Threshold-Training",
      meta: "40–50 min · 80–85 % HFmax",
      isRest: false,
      session: {
        objective:
          "Laktatschwelle anheben – kontrolliertes, forderndes Tempo halten.",
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
        bonus:
          "Direkt relevant für HYROX-Laufabschnitte zwischen den Stationen.",
      },
    },
    mi: {
      typeId: "swim",
      title: "Freistil",
      meta: "45–60 min · Technikfokus",
      isRest: false,
      session: {
        objective:
          "Freistil-Technik systematisch aufbauen – kein Konditionstraining, sondern Bewegungslernen.",
        blocks: [
          {
            title: "Aufbau einer Einheit",
            items: [
              "Einschwimmen: 200m Brust oder Rücken locker",
              "Armzug-Drills: Catch-up-Drill, Einarmzug mit Brett",
              "Beinschlag: mit Brett, flach & gestreckt",
              "Koordination: Arm + Bein + Atmung zusammenführen",
              "Kurze Freistil-Strecken: 4–6×25m mit Fokus auf eine Technik",
            ],
          },
        ],
        bonus:
          "Schwimmen ist hervorragend für die Ausdauer (aerob, gelenkfrei) und fördert Schulter- sowie Rumpfstabilität – beides direkt relevant für SkiErg und Schlitten.",
      },
    },
    do: {
      typeId: "kraft",
      title: "Oberkörper",
      meta: "ca. 60–75 min",
      isRest: false,
      session: {
        objective: "Kraft im Oberkörper – Push/Pull-Fokus für Wall Balls, SkiErg, Burpees.",
        blocks: [
          {
            title: "Inhalt",
            items: [
              "Drücken: Schulterdrücken, Bankdrücken",
              "Ziehen: Klimmzüge, Rudern",
              "Core: Plank-Varianten, Hollow Holds",
            ],
          },
        ],
        bonus: "",
      },
    },
    fr: {
      typeId: "vo2",
      title: "VO₂max-Intervalle",
      meta: "30–40 min · 90–95 % HFmax",
      isRest: false,
      session: {
        objective:
          "Maximale Sauerstoffaufnahme verbessern – kurze, sehr intensive Intervalle.",
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
        bonus: "Top-End-Fitness – macht das Renntempo subjektiv leichter.",
      },
    },
    sa: {
      typeId: null,
      title: "Aktive Erholung",
      meta: "Ruhetag",
      isRest: true,
      session: {
        objective: "Regeneration – Mobility, Spaziergang, Dehnen.",
        blocks: [],
        bonus: "",
      },
    },
    so: {
      typeId: "kraft",
      title: "Unterkörper",
      meta: "ca. 60–75 min",
      isRest: false,
      session: {
        objective:
          "Beinkraft – Grundlage für Schlitten, Lunges, Wall Balls.",
        blocks: [
          {
            title: "Inhalt",
            items: [
              "Kniebeugen / Front Squats",
              "Kreuzheben oder RDL",
              "Ausfallschritte (Walking Lunges)",
              "Wadenheben, Core",
            ],
          },
        ],
        bonus: "",
      },
    },
  };

  const notes = [
    {
      id: uid(),
      title: "Phasenaufbau bis September",
      body: "Bis September in Phasen aufbauen: erst aerobe Grundlage (viel Zone 2), dann zunehmend Threshold und VO₂max integrieren. In den letzten 2–3 Wochen vor dem Event: Tapering – Umfang reduzieren, Intensität halten, Erholung priorisieren.",
    },
    {
      id: uid(),
      title: "Laufen & passive Strukturen",
      body: "Beim Laufen passive Strukturen (Sehnen, Bänder, Gelenke) langsam an steigende Umfänge gewöhnen. Sie passen sich deutlich langsamer an als das Herz-Kreislauf-System. Lieber Umfang behutsam steigern, um Überlastungen (Schienbein, Achillessehne) zu vermeiden.",
    },
    {
      id: uid(),
      title: "HF-Drift (Cardiac Drift)",
      body: "Bei langen Einheiten steigt die Herzfrequenz bei gleichem Tempo mit der Zeit an (Cardiac Drift), v.a. durch Flüssigkeitsverlust und Wärme. Ein geringer Drift über lange Einheiten ist ein gutes Zeichen für aerobe Fitness. Auf Hydration achten.",
    },
    {
      id: uid(),
      title: "Schwimmen im Wochenplan",
      body: "Schwimmen liegt bewusst am Mittwoch als gelenkschonende Einheit zwischen den Laufbelastungen. Es trainiert Ausdauer ohne Stoßbelastung und verbessert Schulter- und Rumpfstabilität – relevant für SkiErg, Rudern und Schlitten.",
    },
  ];

  return {
    id: uid(),
    name: "HYROX Köln",
    sport: "HYROX",
    sportId: "hyrox",
    targetDate: "2026-09-01",
    targetGoal: "sub60",
    category: "Doubles",
    description: "",
    types,
    days,
    notes,
    log: {},
    footerNote:
      "Samstag bleibt fester Ruhetag. Sonntag Unterkörper – danach genug Zeit zur Erholung bis Dienstag.",
    createdAt: Date.now(),
  };
}

export function seedGoals() {
  return [hyroxGoal()];
}

// A fresh, empty training session (objective + blocks + bonus).
export function emptySession() {
  return { objective: "", blocks: [], bonus: "" };
}

// A second/third session attached to a weekday (Doppelsession). Carries its own
// type/title/meta + session content, mirroring the primary day fields.
export function emptyExtraSession() {
  return {
    id: uid(),
    typeId: null,
    title: "",
    meta: "",
    session: emptySession(),
  };
}

// A fresh, empty week for newly created goals.
export function emptyDays() {
  const days = {};
  for (const key of DAY_KEYS) {
    days[key] = {
      typeId: null,
      title: "",
      meta: "",
      isRest: false,
      session: emptySession(),
      extraSessions: [],
    };
  }
  return days;
}

export function emptyGoal(name = "Neues Trainingsziel") {
  return {
    id: uid(),
    name,
    sport: "",
    sportId: "custom",
    targetDate: "",
    targetGoal: "",
    category: "",
    description: "",
    types: [
      { id: "kraft", label: "Kraft", color: "#f0a830" },
      { id: "zone2", label: "Zone 2", color: "#5fb87a" },
    ],
    days: emptyDays(),
    notes: [],
    log: {},
    footerNote: "",
    createdAt: Date.now(),
  };
}

// A fresh goal pre-filled from a sport preset (types + category default).
export function goalFromSport(sport, name) {
  const g = emptyGoal(name || sport.label);
  g.sportId = sport.id;
  g.sport = sport.label;
  // default the target date to today (local), so the date field is pre-filled
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  g.targetDate = local.toISOString().slice(0, 10);
  g.types = sport.types.map((t) => ({ id: uid(), label: t.label, color: t.color }));
  return g;
}
