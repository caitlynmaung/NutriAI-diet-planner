import { FOODS, rdaFor, type RdaProfile } from "./foods";
import type { LoggedItem } from "./storage";

const BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export type NutrientTotals = {
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  iron: number; calcium: number; b12: number; vitaminD: number; zinc: number;
  sodium: number;
};

export const emptyTotals = (): NutrientTotals => ({
  calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
  iron: 0, calcium: 0, b12: 0, vitaminD: 0, zinc: 0, sodium: 0,
});

export function nutrientTotals(items: LoggedItem[]): NutrientTotals {
  const t = emptyTotals();
  for (const it of items) {
    t.calories += it.calories;
    t.protein  += it.protein;
    t.carbs    += it.carbs;
    t.fat      += it.fat;
    const f = BY_ID.get(it.foodId);
    if (!f) continue;
    const r = it.amount / f.baseAmount;
    t.fiber     += f.fiber * r;
    t.iron      += f.iron * r;
    t.calcium   += f.calcium * r;
    t.b12       += f.b12 * r;
    t.vitaminD  += f.vitaminD * r;
    t.zinc      += f.zinc * r;
    t.sodium    += f.sodium * r;
  }
  return t;
}

export type TrackedKey = "fiber" | "iron" | "calcium" | "b12" | "vitaminD" | "zinc";

export const NUTRIENT_META: Record<TrackedKey, { label: string; unit: string; decimals: number }> = {
  fiber:    { label: "Fibre",     unit: "g",  decimals: 0 },
  iron:     { label: "Iron",      unit: "mg", decimals: 1 },
  calcium:  { label: "Calcium",   unit: "mg", decimals: 0 },
  b12:      { label: "Vit B12",   unit: "µg", decimals: 1 },
  vitaminD: { label: "Vit D",     unit: "µg", decimals: 1 },
  zinc:     { label: "Zinc",      unit: "mg", decimals: 1 },
};

export const TRACKED_KEYS: TrackedKey[] = ["fiber", "iron", "calcium", "b12", "vitaminD", "zinc"];

export type RdaTargets = Record<TrackedKey, number>;

export function rdaTargetsFor(profile?: RdaProfile | null): RdaTargets {
  const r = rdaFor(profile ?? { age: 35, sex: "female" });
  return { fiber: r.fiber, iron: r.iron, calcium: r.calcium, b12: r.b12, vitaminD: r.vitaminD, zinc: r.zinc };
}

/** Returns the keys whose intake is below 80% of RDA. */
export function gapKeys(values: Pick<NutrientTotals, TrackedKey>, rda: RdaTargets): TrackedKey[] {
  return TRACKED_KEYS.filter((k) => values[k] < rda[k] * 0.8);
}
