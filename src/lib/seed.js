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

function hyroxGoal() {
  const types = [
    { id: "kraft", label: "Kraft", color: "#f0a830" },
    { id: "zone2", label: "Zone 2", color: "#5fb87a" },
    { id: "threshold", label: "Threshold", color: "#5b8def" },
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
            title: "Inhalt",
            items: [
              "Lockerer Dauerlauf oder Rad im Zone-2-Bereich",
              "Gleichmäßiges Tempo, Nasenatmung möglich",
              "Optional als Brick mit kurzer Lauf-Abschlusseinheit",
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
            title: "Aufbau einer Einheit",
            items: [
              "Einlaufen: 10–15 min locker",
              "Hauptteil: 2–3 × 8–12 min an der Schwelle",
              "Trabpause: 2–3 min zwischen den Blöcken",
              "Auslaufen: 10 min locker",
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
            title: "Aufbau einer Einheit",
            items: [
              "Einlaufen: 10 min locker + Steigerungen",
              "Hauptteil: 4–6 × 3 min hart / 2–3 min locker",
              "Auslaufen: 8–10 min locker",
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
    targetDate: "2026-09-01",
    description:
      "Vorbereitung auf HYROX im September – Kombination aus Ausdauer, Kraft und Technik.",
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

// A fresh, empty week for newly created goals.
export function emptyDays() {
  const days = {};
  for (const key of DAY_KEYS) {
    days[key] = {
      typeId: null,
      title: "",
      meta: "",
      isRest: false,
      session: { objective: "", blocks: [], bonus: "" },
    };
  }
  return days;
}

export function emptyGoal(name = "Neues Trainingsziel") {
  return {
    id: uid(),
    name,
    sport: "",
    targetDate: "",
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
