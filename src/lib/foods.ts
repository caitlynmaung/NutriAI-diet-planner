import rawFoods from "@/data/foods.json";

export type Allergen =
  | "dairy"
  | "eggs"
  | "gluten"
  | "soy"
  | "peanuts"
  | "tree_nuts"
  | "shellfish"
  | "fish"
  | "sesame";

export type DietTag = "vegan" | "vegetarian" | "pescatarian" | "omnivore";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";
export type ConditionFlag = "high_sodium" | "high_glycemic" | "high_fat" | "high_protein";

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  unit: "g" | "ml" | "piece";
  baseAmount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  allergens: Allergen[];
  diet: DietTag;
  meals: MealSlot[];
  flags: ConditionFlag[];
};

export const FOODS: FoodItem[] = rawFoods as FoodItem[];

const ALLOWS_DIET: Record<DietTag, DietTag[]> = {
  vegan: ["vegan"],
  vegetarian: ["vegan", "vegetarian"],
  pescatarian: ["vegan", "vegetarian", "pescatarian"],
  omnivore: ["vegan", "vegetarian", "pescatarian", "omnivore"],
};

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  dairy: "Dairy",
  eggs: "Eggs",
  gluten: "Gluten",
  soy: "Soy",
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  shellfish: "Shellfish",
  fish: "Fish",
  sesame: "Sesame",
};

export type Condition =
  | "diabetes"
  | "hypertension"
  | "high_cholesterol"
  | "ckd"
  | "ibs"
  | "gerd"
  | "none";

export const CONDITION_LABEL: Record<Exclude<Condition, "none">, string> = {
  diabetes: "Type 2 Diabetes",
  hypertension: "Hypertension",
  high_cholesterol: "High cholesterol",
  ckd: "Kidney disease (CKD)",
  ibs: "IBS",
  gerd: "GERD / Acid reflux",
};

export type HealthFilters = {
  diet: DietTag;
  allergens: Allergen[];
  conditions: Condition[];
};

// --- Persona trigger heuristics (computed from name + category) ---------

// High-FODMAP / common IBS triggers
const IBS_TRIGGER_PATTERNS = [
  /\bonion\b/i, /\bgarlic\b/i, /\bleek\b/i, /\bshallot\b/i,
  /\bwheat\b/i, /\brye\b/i, /\bbarley\b/i, /\bbread\b/i, /\bpasta\b/i, /\bcouscous\b/i,
  /\bapple\b/i, /\bpear\b/i, /\bmango\b/i, /\bwatermelon\b/i, /\bcherry\b/i, /\bplum\b/i,
  /\bhoney\b/i, /\bagave\b/i, /\bcorn syrup\b/i,
  /\bbeans?\b/i, /\blentil/i, /\bchickpea/i, /\bsoybean/i,
  /\bmilk\b/i, /\byogurt\b/i, /\bcottage cheese\b/i, /\bice cream\b/i,
  /\bcauliflower\b/i, /\bmushroom\b/i, /\basparagus\b/i, /\bcabbage\b/i,
];

// GERD common triggers: acidic, spicy, high-fat, caffeine, mint, chocolate, alcohol, tomato, citrus
const GERD_TRIGGER_PATTERNS = [
  /\btomato/i, /\borange\b/i, /\blemon/i, /\blime\b/i, /\bgrapefruit/i, /\bpineapple/i,
  /\bcoffee\b/i, /\bespresso\b/i, /\btea\b/i, /\bcola\b/i, /\bsoda\b/i,
  /\bchocolate\b/i, /\bcocoa\b/i, /\bmint\b/i, /\bpeppermint\b/i,
  /\balcohol/i, /\bwine\b/i, /\bbeer\b/i, /\bliquor/i,
  /\bchili\b/i, /\bpepper, hot/i, /\bjalapeno/i, /\bsalsa\b/i, /\bcurry\b/i,
  /\bfried\b/i, /\bbacon\b/i, /\bsausage\b/i, /\bpepperoni/i, /\bvinegar/i,
];

function matchesAny(food: FoodItem, patterns: RegExp[]) {
  const hay = `${food.name} ${food.category}`;
  return patterns.some((p) => p.test(hay));
}

export function ibsTrigger(food: FoodItem): boolean {
  return matchesAny(food, IBS_TRIGGER_PATTERNS);
}
export function gerdTrigger(food: FoodItem): boolean {
  return matchesAny(food, GERD_TRIGGER_PATTERNS) || food.fat > 25;
}

export function isFoodAllowed(food: FoodItem, f: HealthFilters): boolean {
  if (!ALLOWS_DIET[f.diet].includes(food.diet)) return false;
  if (food.allergens.some((a) => f.allergens.includes(a))) return false;
  if (f.conditions.includes("hypertension") && (food.flags.includes("high_sodium") || food.sodium > 400)) return false;
  if (f.conditions.includes("diabetes") && food.flags.includes("high_glycemic")) return false;
  if (f.conditions.includes("high_cholesterol") && food.flags.includes("high_fat") && food.fat > 20) return false;
  if (f.conditions.includes("ckd") && (food.sodium > 300 || food.protein > 28)) return false;
  if (f.conditions.includes("ibs") && ibsTrigger(food)) return false;
  if (f.conditions.includes("gerd") && gerdTrigger(food)) return false;
  return true;
}

// Soft scoring penalty for foods that pass filtering but are borderline for the
// persona. Lower is better. Returned in normalized units roughly comparable to
// the macro error score.
export function clinicalPenalty(food: FoodItem, conditions: Condition[]): number {
  let p = 0;
  if (conditions.includes("hypertension")) p += food.sodium / 1000; // ~0..1
  if (conditions.includes("diabetes")) p += Math.max(0, food.carbs - 20) / 80;
  if (conditions.includes("high_cholesterol")) p += Math.max(0, food.fat - 10) / 40;
  if (conditions.includes("ckd")) p += food.protein / 60 + food.sodium / 1500;
  if (conditions.includes("ibs") && ibsTrigger(food)) p += 0.5;
  if (conditions.includes("gerd") && gerdTrigger(food)) p += 0.5;
  return p;
}
