// Shared Lucide icon helpers so the views render consistent line icons
// (instead of emoji) for sports and session steps.
import Footprints from "@lucide/svelte/icons/footprints";
import Bike from "@lucide/svelte/icons/bike";
import Droplets from "@lucide/svelte/icons/droplets";
import Dumbbell from "@lucide/svelte/icons/dumbbell";
import Activity from "@lucide/svelte/icons/activity";
import Flame from "@lucide/svelte/icons/flame";
import Zap from "@lucide/svelte/icons/zap";
import Snowflake from "@lucide/svelte/icons/snowflake";

// Map a sport / training-type label to a Lucide icon component.
export function sportIcon(type) {
  const t = String(type || "").toLowerCase();
  if (/swim|schwimm|kraul/.test(t)) return Droplets;
  if (/ride|bike|rad|cycl|spin/.test(t)) return Bike;
  if (/weight|strength|kraft|gym|körper|bein|push|pull|squat|press|bank/.test(t)) return Dumbbell;
  if (/run|lauf|threshold|tempo|vo2|zone|jog|easy|long/.test(t)) return Footprints;
  if (/walk|hike|geh/.test(t)) return Footprints;
  return Activity;
}

// Decorative icon set for session steps (by index).
export const STEP_ICONS = [Flame, Zap, Snowflake, Footprints, Dumbbell, Bike];
