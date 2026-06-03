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

const NUTRIENT_SUPPORT_FOODS: FoodItem[] = [
  {
    id: "support-fortified-nutritional-yeast",
    name: "Fortified nutritional yeast flakes",
    category: "Supplements and fortified foods",
    unit: "g",
    baseAmount: 100,
    calories: 325,
    protein: 40,
    carbs: 35,
    fat: 5,
    fiber: 20,
    sodium: 30,
    iron: 5,
    calcium: 67,
    b12: 24,
    vitaminD: 0,
    zinc: 8,
    potassium: 1200,
    magnesium: 180,
    omega3: 0.1,
    gi: 15,
    pricePer100g: 3.5,
    allergens: [],
    diet: "vegan",
    meals: ["snacks", "lunch", "dinner"],
    flags: [],
    tags: ["fortified", "low_sodium"],
  },
  {
    id: "support-fortified-oat-milk",
    name: "Fortified unsweetened oat milk",
    category: "Beverages",
    unit: "ml",
    baseAmount: 100,
    calories: 45,
    protein: 1,
    carbs: 6.5,
    fat: 1.5,
    fiber: 0.8,
    sodium: 45,
    iron: 0.1,
    calcium: 120,
    b12: 0.4,
    vitaminD: 2.5,
    zinc: 0.2,
    potassium: 160,
    magnesium: 12,
    omega3: 0.05,
    gi: 45,
    pricePer100g: 0.22,
    allergens: [],
    diet: "vegan",
    meals: ["breakfast", "snacks", "lunch", "dinner"],
    flags: [],
    tags: ["fortified", "low_sodium"],
  },
  {
    id: "support-low-sodium-potato-bean-bowl",
    name: "Low-sodium potato and white bean bowl",
    category: "Meals, Entrees, and Side Dishes",
    unit: "g",
    baseAmount: 100,
    calories: 118,
    protein: 5,
    carbs: 22,
    fat: 1,
    fiber: 5,
    sodium: 35,
    iron: 2.2,
    calcium: 55,
    b12: 0,
    vitaminD: 0,
    zinc: 1,
    potassium: 620,
    magnesium: 52,
    omega3: 0.05,
    gi: 45,
    pricePer100g: 0.75,
    allergens: [],
    diet: "vegan",
    meals: ["lunch", "dinner", "snacks"],
    flags: [],
    tags: ["low_sodium"],
  },
];

// Normalise raw USDA records: ensure tags array, and back-fill obvious
// high-FODMAP triggers by name so the IBS filter never lets them through.
const FODMAP_NAME_RE = /\b(onion|garlic|leek|shallot|scallion|wheat|rye|barley|asparagus|artichoke)\b/i;
export const FOODS: FoodItem[] = [...(rawFoods as FoodItem[]), ...NUTRIENT_SUPPORT_FOODS].map((f) => {
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

/**
 * Explain why a food was (or would be) excluded for a given filter set.
 * Returns ALL matching reasons so the UI can show every flag.
 * Empty array == food is allowed.
 */
export function explainExclusion(food: FoodItem, f: HealthFilters): string[] {
  const reasons: string[] = [];
  if (isBabyFood(food)) reasons.push("Baby food / infant formula — not for adult plans");
  if (!ALLOWS_DIET[f.diet].includes(food.diet))
    reasons.push(`Diet mismatch — item is ${food.diet}, plan is ${f.diet}`);
  if ((f.diet === "vegan" || f.diet === "vegetarian") &&
      MEAT_TAGS.some((t) => food.tags.includes(t)))
    reasons.push(`Contains meat (${MEAT_TAGS.filter((t) => food.tags.includes(t)).join(", ")}) — excluded for ${f.diet}`);
  if ((f.diet === "vegan" || f.diet === "vegetarian") &&
      SEAFOOD_TAGS.some((t) => food.tags.includes(t)))
    reasons.push(`Contains seafood — excluded for ${f.diet}`);
  if (f.diet === "pescatarian" && MEAT_TAGS.some((t) => food.tags.includes(t)))
    reasons.push(`Contains red/poultry meat — excluded for pescatarian`);

  for (const a of f.allergens) {
    if (hasAllergen(food, a)) {
      if (a === "dairy" && food.tags.includes("lactose"))
        reasons.push(`Lactose / dairy allergen flagged`);
      else if (a === "gluten" && (food.tags.includes("gluten_cc_risk") || food.tags.includes("contains_gluten")))
        reasons.push(`Cross-contamination risk for gluten (Celiac-safe filter)`);
      else reasons.push(`Allergen: ${ALLERGEN_LABEL[a]}`);
    }
  }
  for (const t of f.excludeTags ?? []) {
    if (food.tags.includes(t)) reasons.push(`Excluded tag: "${t}"`);
  }

  if (f.conditions.includes("hypertension")) {
    if (food.sodium > 250) reasons.push(`Sodium ${Math.round(food.sodium)} mg/100g > 250 mg DASH cap`);
    if (food.flags.includes("high_sodium")) reasons.push(`Flagged high-sodium for hypertension`);
  }
  if (f.conditions.includes("diabetes")) {
    if (food.gi > 55) reasons.push(`Glycemic Index ${food.gi} > 55 — high-GI for T2D`);
    if (food.tags.includes("added_sugar")) reasons.push(`Contains added sugar — excluded for T2D`);
    if (food.flags.includes("high_glycemic")) reasons.push(`Flagged high-glycemic for T2D`);
  }
  if (f.conditions.includes("high_cholesterol")) {
    if (food.flags.includes("high_fat") && food.fat > 18) reasons.push(`High saturated fat for cholesterol management`);
    if (food.tags.includes("fried")) reasons.push(`Fried food — excluded for high cholesterol`);
  }
  if (f.conditions.includes("ckd")) {
    if (food.sodium > 250) reasons.push(`Sodium > 250 mg — CKD restriction`);
    if (food.protein > 28) reasons.push(`Protein > 28 g/100g — CKD restriction`);
    if (food.potassium > 350) reasons.push(`Potassium > 350 mg — CKD restriction`);
  }
  if (f.conditions.includes("ibs")) {
    if (food.tags.includes("high_fodmap")) reasons.push(`High-FODMAP — excluded for IBS (low-FODMAP plan)`);
    if (food.tags.includes("lactose")) reasons.push(`Lactose — excluded for IBS`);
  }
  if (f.conditions.includes("gerd")) {
    if (food.tags.includes("gerd_trigger")) reasons.push(`GERD trigger (acidic / spicy / caffeinated)`);
    if (food.fat > 22) reasons.push(`Fat > 22 g/100g — relaxes LES, GERD trigger`);
  }
  return reasons;
}

/**
 * Age & sex-tailored RDA (Recommended Dietary Allowance) for the macronutrients
 * and micronutrients we track. Values follow NIH/ODS adult guidelines.
 */
export type RdaProfile = { age: number; sex: "male" | "female" };
export function rdaFor({ age, sex }: RdaProfile) {
  const adult = age >= 19;
  const senior = age >= 51;
  return {
    iron:      sex === "female" && age >= 19 && age <= 50 ? 18 : 8,
    calcium:   senior ? 1200 : 1000,
    b12:       2.4,
    vitaminD:  age >= 70 ? 20 : 15,
    zinc:      sex === "male" ? 11 : 8,
    potassium: sex === "male" ? 3400 : 2600,
    magnesium: sex === "male" ? (adult && age <= 30 ? 400 : 420) : (adult && age <= 30 ? 310 : 320),
    fiber:     sex === "male" ? (senior ? 30 : 38) : (senior ? 21 : 25),
    sodium:    1500, // adequate intake / DASH upper bound
  };
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
