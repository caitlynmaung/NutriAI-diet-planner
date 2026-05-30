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

export type Condition = "diabetes" | "hypertension" | "high_cholesterol" | "ckd" | "none";

export const CONDITION_LABEL: Record<Exclude<Condition, "none">, string> = {
  diabetes: "Diabetes",
  hypertension: "Hypertension",
  high_cholesterol: "High cholesterol",
  ckd: "Kidney disease (CKD)",
};

export type HealthFilters = {
  diet: DietTag;
  allergens: Allergen[];
  conditions: Condition[];
};

export function isFoodAllowed(food: FoodItem, f: HealthFilters): boolean {
  if (!ALLOWS_DIET[f.diet].includes(food.diet)) return false;
  if (food.allergens.some((a) => f.allergens.includes(a))) return false;
  if (f.conditions.includes("hypertension") && food.flags.includes("high_sodium")) return false;
  if (f.conditions.includes("diabetes") && food.flags.includes("high_glycemic")) return false;
  if (f.conditions.includes("high_cholesterol") && food.flags.includes("high_fat") && food.fat > 25) return false;
  if (f.conditions.includes("ckd") && (food.sodium > 300 || food.protein > 28)) return false;
  return true;
}
