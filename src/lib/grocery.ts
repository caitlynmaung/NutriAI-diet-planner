import { FOODS, normalizedKey, type FoodItem } from "./foods";
import type { MealPlan } from "./mealPlan";

export type GroceryItem = {
  key: string;
  name: string;
  category: string;
  totalGrams: number;
  estCost: number;
  unit: "g" | "ml" | "piece";
};

export type GroceryList = {
  items: GroceryItem[];
  byCategory: Record<string, GroceryItem[]>;
  totalCost: number;
  itemCount: number;
};

/** Consolidate every item across the 7-day plan into a single shopping list. */
export function buildGroceryList(plan: MealPlan): GroceryList {
  const byId = new Map(FOODS.map((f) => [f.id, f]));
  const buckets = new Map<string, GroceryItem>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const it of meal.items) {
        const food = byId.get(it.foodId);
        if (!food) continue;
        const key = normalizedKey(food);
        const ex = buckets.get(key);
        const grams = it.amount;
        const cost = food.pricePer100g * (grams / 100);
        if (ex) {
          ex.totalGrams += grams;
          ex.estCost += cost;
        } else {
          buckets.set(key, {
            key,
            name: prettyName(food),
            category: food.category,
            totalGrams: grams,
            estCost: cost,
            unit: food.unit,
          });
        }
      }
    }
  }
  const items = Array.from(buckets.values()).sort((a, b) => b.estCost - a.estCost);
  const byCategory: Record<string, GroceryItem[]> = {};
  for (const i of items) (byCategory[i.category] ??= []).push(i);
  const totalCost = items.reduce((a, i) => a + i.estCost, 0);
  return { items, byCategory, totalCost, itemCount: items.length };
}

function prettyName(food: FoodItem): string {
  const base = food.name.split(",")[0].trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}
