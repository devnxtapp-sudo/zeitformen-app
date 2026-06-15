// Body-analysis metric catalogue (Körperanalyse). Mirrors the values an InBody
// readout reports, but kept generic so manual entry works without the device.
// `goodDir` drives trend coloring: +1 = higher is better, -1 = lower is better,
// 0 = neutral (no color). `step`/`inputmode` tune the numeric inputs.

export const CORE_METRICS = [
  { id: "weight", label: "Gewicht", unit: "kg", goodDir: 0, step: "0.1" },
  { id: "smm", label: "Skelettmuskelmasse", short: "SMM", unit: "kg", goodDir: 1, step: "0.1" },
  { id: "fatMass", label: "Körperfettmasse", unit: "kg", goodDir: -1, step: "0.1" },
  { id: "bodyFat", label: "Körperfett", unit: "%", goodDir: -1, step: "0.1" },
  { id: "bmi", label: "BMI", unit: "", goodDir: 0, step: "0.1" },
  { id: "visceral", label: "Viszerales Fett", short: "Viszeral", unit: "Lvl", goodDir: -1, step: "1" },
];

export const OPTIONAL_METRICS = [
  { id: "water", label: "Körperwasser", unit: "l", goodDir: 1, step: "0.1" },
  { id: "bmr", label: "Grundumsatz", unit: "kcal", goodDir: 0, step: "1" },
  { id: "phaseAngle", label: "Phasenwinkel", short: "Phase", unit: "°", goodDir: 1, step: "0.1" },
  { id: "score", label: "InBody-Score", short: "Score", unit: "Pkt", goodDir: 1, step: "1" },
];

export const ALL_METRICS = [...CORE_METRICS, ...OPTIONAL_METRICS];

export function metricById(id) {
  return ALL_METRICS.find((m) => m.id === id) || null;
}

export function fmtMetric(m, value) {
  if (value == null || value === "") return "–";
  return m.unit ? `${value} ${m.unit}` : `${value}`;
}
