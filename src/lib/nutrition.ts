import type { Allergen, Condition, DietTag } from "./foods";

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  diet: DietTag;
  allergens: Allergen[];
  conditions: Condition[];
};

export type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTargets(p: Profile): Targets {
  const bmr =
    p.sex === "male"
      ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
      : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  const tdee = bmr * ACTIVITY_MULT[p.activity];
  const adj = p.goal === "lose" ? -500 : p.goal === "gain" ? 350 : 0;
  const calories = Math.round(tdee + adj);

  // Condition-aware macro split (T2D lowers carbs, CKD lowers protein, etc.)
  let pPct = 0.3, fPct = 0.25, cPct = 0.45;
  const cs = p.conditions ?? [];
  if (cs.includes("diabetes")) { cPct = 0.35; fPct = 0.30; pPct = 0.35; }
  if (cs.includes("high_cholesterol")) { fPct = Math.min(fPct, 0.25); }
  if (cs.includes("ckd")) { pPct = 0.15; cPct = 0.55; fPct = 0.30; }
  if (cs.includes("gerd")) { fPct = Math.min(fPct, 0.25); }
  const sum = pPct + fPct + cPct;
  pPct /= sum; fPct /= sum; cPct /= sum;

  const protein = Math.round((calories * pPct) / 4);
  const fat = Math.round((calories * fPct) / 9);
  const carbs = Math.round((calories * cPct) / 4);
  return { calories, protein, carbs, fat };
}

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little/no exercise)",
  light: "Light (1–3 days/week)",
  moderate: "Moderate (3–5 days/week)",
  active: "Active (6–7 days/week)",
  very_active: "Very active (athlete)",
};

export const GOAL_LABEL: Record<Goal, string> = {
  lose: "Lose weight",
  maintain: "Maintain",
  gain: "Gain muscle",
};

export const DIET_LABEL: Record<DietTag, string> = {
  omnivore: "Omnivore",
  pescatarian: "Pescatarian",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};
