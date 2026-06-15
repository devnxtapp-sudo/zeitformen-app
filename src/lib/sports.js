// Sport presets. Each sport seeds a new goal with sensible defaults —
// training types, suggested log metrics and competition categories.
// Everything stays fully editable inside the app; presets are only a starting point.

// Shared palette (matches the app's type colors).
const C = {
  orange: "#f0a830",
  green: "#5fb87a",
  blue: "#5b8def",
  purple: "#a779e9",
  grey: "#9aa0a6",
  red: "#e5534b",
  teal: "#3fb6b2",
};

export const SPORTS = {
  hyrox: {
    id: "hyrox",
    label: "HYROX",
    icon: "🏟️",
    types: [
      { label: "Kraft", color: C.orange },
      { label: "Zone 2", color: C.green },
      { label: "Threshold", color: C.blue },
      { label: "VO₂max", color: C.purple },
      { label: "Schwimmen", color: C.grey },
    ],
    metrics: ["Dauer (min)", "Distanz (km)", "Puls ø"],
    categories: ["Single", "Doubles", "Mixed Doubles", "Relay", "Pro"],
  },

  running: {
    id: "running",
    label: "Laufen / Marathon",
    icon: "🏃",
    types: [
      { label: "Long Run", color: C.green },
      { label: "Tempo", color: C.blue },
      { label: "Intervalle", color: C.purple },
      { label: "Recovery", color: C.grey },
    ],
    metrics: ["Distanz (km)", "Pace (min/km)", "Puls ø"],
    categories: ["5 km", "10 km", "Halbmarathon", "Marathon", "Ultra"],
  },

  triathlon: {
    id: "triathlon",
    label: "Triathlon / Ironman",
    icon: "🏊",
    types: [
      { label: "Schwimmen", color: C.teal },
      { label: "Rad", color: C.blue },
      { label: "Laufen", color: C.green },
      { label: "Brick", color: C.orange },
      { label: "Recovery", color: C.grey },
    ],
    metrics: ["Disziplin", "Dauer (min)", "Distanz (km)", "Puls ø"],
    categories: ["Sprint", "Olympic", "70.3", "Ironman"],
  },

  cycling: {
    id: "cycling",
    label: "Radsport",
    icon: "🚴",
    types: [
      { label: "Zone 2", color: C.green },
      { label: "Sweet Spot", color: C.orange },
      { label: "VO₂max", color: C.purple },
      { label: "Recovery", color: C.grey },
    ],
    metrics: ["Distanz (km)", "Dauer (min)", "Watt ø", "Puls ø", "TSS"],
    categories: ["Granfondo", "Zeitfahren", "Rennen", "Bikepacking"],
  },

  swimming: {
    id: "swimming",
    label: "Schwimmen",
    icon: "🏊‍♂️",
    types: [
      { label: "Technik", color: C.teal },
      { label: "Schwelle", color: C.blue },
      { label: "Intervalle", color: C.purple },
      { label: "Recovery", color: C.grey },
    ],
    metrics: ["Distanz (m)", "100m-Split", "Dauer (min)"],
    categories: ["Freiwasser", "Becken 50 m", "Becken 25 m"],
  },

  crossfit: {
    id: "crossfit",
    label: "CrossFit",
    icon: "🤸",
    types: [
      { label: "WOD", color: C.red },
      { label: "Strength", color: C.orange },
      { label: "MetCon", color: C.blue },
      { label: "Skill", color: C.purple },
    ],
    metrics: ["Zeit", "Runden", "Gewicht (kg)"],
    categories: ["RX", "Scaled", "Open", "Masters"],
  },

  strength: {
    id: "strength",
    label: "Krafttraining",
    icon: "🏋️",
    types: [
      { label: "Push", color: C.orange },
      { label: "Pull", color: C.blue },
      { label: "Beine", color: C.green },
      { label: "Ganzkörper", color: C.purple },
    ],
    metrics: ["Sätze", "Wdh", "Gewicht (kg)"],
    categories: ["Hypertrophie", "Maximalkraft", "Kraftausdauer"],
  },

  custom: {
    id: "custom",
    label: "Eigenes",
    icon: "✨",
    types: [
      { label: "Kraft", color: C.orange },
      { label: "Ausdauer", color: C.green },
    ],
    metrics: ["Dauer (min)", "Distanz (km)", "Puls ø"],
    categories: [],
  },
};

// Display order for the sport picker.
export const SPORT_LIST = [
  SPORTS.hyrox,
  SPORTS.running,
  SPORTS.triathlon,
  SPORTS.cycling,
  SPORTS.swimming,
  SPORTS.crossfit,
  SPORTS.strength,
  SPORTS.custom,
];

// Competition presets shown in onboarding. Each maps to a sport preset (for the
// training types/metrics) but carries its own competition-specific display name.
// `custom: true` lets the user type their own competition name.
export const COMPETITIONS = [
  { id: "hyrox", label: "HYROX", sportId: "hyrox" },
  { id: "marathon", label: "Halbmarathon / Marathon", sportId: "running" },
  { id: "ironman", label: "Ironman", sportId: "triathlon" },
  { id: "triathlon", label: "Triathlon", sportId: "triathlon" },
  { id: "custom", label: "Eigener", sportId: "custom", custom: true },
];

export function getSport(id) {
  return SPORTS[id] || null;
}

// Suggested log metrics for a goal, based on its sport (with a generic fallback).
export function metricsForSport(sportId) {
  return SPORTS[sportId]?.metrics ?? ["Dauer (min)", "Distanz (km)", "Puls ø"];
}
