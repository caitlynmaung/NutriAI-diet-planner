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
  // micronutrients per 100g
  iron: number;       // mg
  calcium: number;    // mg
  b12: number;        // µg
  vitaminD: number;   // µg
  zinc: number;       // mg
  potassium: number;  // mg
  magnesium: number;  // mg
  omega3: number;     // g
  gi: number;         // glycemic index 0-100 (0 if not applicable)
  pricePer100g: number; // USD per 100g
  allergens: Allergen[];
  diet: DietTag;
  meals: MealSlot[];
  flags: ConditionFlag[];
  tags: string[];
};

// Normalise raw USDA records: ensure tags array, and back-fill obvious
// high-FODMAP triggers by name so the IBS filter never lets them through.
const FODMAP_NAME_RE = /\b(onion|garlic|leek|shallot|scallion|wheat|rye|barley|asparagus|artichoke)\b/i;
export const FOODS: FoodItem[] = (rawFoods as FoodItem[]).map((f) => {
  const tags = f.tags ? [...f.tags] : [];
  if (FODMAP_NAME_RE.test(f.name) && !tags.includes("high_fodmap")) tags.push("high_fodmap");
  return { ...f, tags };
});


// Adult Recommended Daily Allowances (mixed adult average)
export const RDA = {
  iron: 12,        // mg
  calcium: 1000,   // mg
  b12: 2.4,        // µg
  vitaminD: 15,    // µg
  zinc: 9,         // mg
  potassium: 3500, // mg
  magnesium: 380,  // mg
  fiber: 28,       // g
};

const ALLOWS_DIET: Record<DietTag, DietTag[]> = {
  vegan: ["vegan"],
  vegetarian: ["vegan", "vegetarian"],
  pescatarian: ["vegan", "vegetarian", "pescatarian"],
  omnivore: ["vegan", "vegetarian", "pescatarian", "omnivore"],
};

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  dairy: "Dairy / Lactose",
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
  hypertension: "Hypertension (DASH)",
  high_cholesterol: "High cholesterol",
  ckd: "Kidney disease (CKD)",
  ibs: "IBS (low-FODMAP)",
  gerd: "GERD / Acid reflux",
};

export type HealthFilters = {
  diet: DietTag;
  allergens: Allergen[];
  conditions: Condition[];
  /** Additional tag-based exclusions, e.g. ["pork"] or ["lactose"]. */
  excludeTags?: string[];
};

// ---- allergen cross-contamination & lactose ------------------------------
function hasAllergen(food: FoodItem, a: Allergen): boolean {
  if (food.allergens.includes(a)) return true;
  if (a === "dairy" && food.tags.includes("lactose")) return true;
  if (a === "gluten" && (food.tags.includes("contains_gluten") || food.tags.includes("gluten_cc_risk"))) return true;
  return false;
}

// Tag-based meat detection so diet filters can't be bypassed by mislabelled USDA items.
const MEAT_TAGS = ["beef", "pork", "poultry"] as const;
const SEAFOOD_TAGS = ["fish", "seafood"] as const;

function isBabyFood(food: FoodItem): boolean {
  if (food.category === "Baby Foods") return true;
  return /\b(babyfood|baby food|infant formula|infant cereal)\b/i.test(food.name);
}

export function isFoodAllowed(food: FoodItem, f: HealthFilters): boolean {
  // Always exclude baby foods / infant formula from adult meal plans.
  if (isBabyFood(food)) return false;
  if (!ALLOWS_DIET[f.diet].includes(food.diet)) return false;
  // Reinforce diet via tags so a mislabelled item (e.g. diet:"vegan" with tags:["beef"])
  // can never slip into a vegetarian/vegan/pescatarian plan.
  if (f.diet === "vegan" || f.diet === "vegetarian") {
    if (MEAT_TAGS.some((t) => food.tags.includes(t))) return false;
    if (SEAFOOD_TAGS.some((t) => food.tags.includes(t))) return false;
  }
  if (f.diet === "pescatarian") {
    if (MEAT_TAGS.some((t) => food.tags.includes(t))) return false;
  }
  if (f.allergens.some((a) => hasAllergen(food, a))) return false;
  if (f.excludeTags?.some((t) => food.tags.includes(t))) return false;


  // ---- clinical filters ------------------------------------------------
  if (f.conditions.includes("hypertension")) {
    // DASH: cap per-100g sodium so daily total can stay ≤ 1500mg
    if (food.sodium > 250 || food.flags.includes("high_sodium")) return false;
  }
  if (f.conditions.includes("diabetes")) {
    // Low-GI ≤ 55 and no added-sugar items
    if (food.gi > 55) return false;
    if (food.tags.includes("added_sugar")) return false;
    if (food.flags.includes("high_glycemic")) return false;
  }
  if (f.conditions.includes("high_cholesterol")) {
    if (food.flags.includes("high_fat") && food.fat > 18) return false;
    if (food.tags.includes("fried")) return false;
  }
  if (f.conditions.includes("ckd")) {
    if (food.sodium > 250 || food.protein > 28 || food.potassium > 350) return false;
  }
  if (f.conditions.includes("ibs")) {
    if (food.tags.includes("high_fodmap")) return false;
    if (food.tags.includes("lactose")) return false;
  }
  if (f.conditions.includes("gerd")) {
    if (food.tags.includes("gerd_trigger")) return false;
    if (food.fat > 22) return false;
  }
  return true;
}

// Soft clinical penalty (lower = better) -----------------------------------
export function clinicalPenalty(food: FoodItem, conditions: Condition[]): number {
  let p = 0;
  if (conditions.includes("hypertension")) p += food.sodium / 800;
  if (conditions.includes("diabetes")) p += Math.max(0, food.gi - 35) / 100 + Math.max(0, food.carbs - 20) / 80;
  if (conditions.includes("high_cholesterol")) p += Math.max(0, food.fat - 10) / 40;
  if (conditions.includes("ckd")) p += food.protein / 60 + food.sodium / 1500;
  if (conditions.includes("ibs") && food.tags.includes("high_fodmap")) p += 0.5;
  if (conditions.includes("gerd") && food.tags.includes("gerd_trigger")) p += 0.5;
  return p;
}

// Used by the grocery-list aggregator to group ingredients
export function normalizedKey(food: FoodItem): string {
  // Reduce noisy USDA names to a coarse ingredient key
  return food.name
    .toLowerCase()
    .replace(/,.*$/, "") // drop everything after first comma
    .replace(/\b(raw|cooked|boiled|baked|frozen|canned|dried|fresh|ready-to-heat|toasted|with|without|added|reduced)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
