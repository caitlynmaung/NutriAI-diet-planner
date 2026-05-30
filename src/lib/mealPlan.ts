import { FOODS, isFoodAllowed, type FoodItem, type HealthFilters } from "./foods";
import type { Targets } from "./nutrition";
import type { LoggedItem, MealType } from "./storage";

export type PlannedMeal = {
  meal: MealType;
  items: LoggedItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
};

export type PlannedDay = {
  date: string;
  meals: PlannedMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
};

export type MealPlan = {
  generatedAt: number;
  filters: HealthFilters;
  targets: Targets;
  days: PlannedDay[];
};

const MEAL_SPLIT: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snacks: 0.1,
};

const MEAL_ITEMS: Record<MealType, [number, number]> = {
  breakfast: [2, 3],
  lunch: [3, 4],
  dinner: [3, 4],
  snacks: [1, 2],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function scaleItem(food: FoodItem, grams: number): LoggedItem {
  const r = grams / food.baseAmount;
  return {
    id: crypto.randomUUID(),
    foodId: food.id,
    name: food.name,
    unit: food.unit,
    amount: Math.round(grams),
    calories: food.calories * r,
    protein: food.protein * r,
    carbs: food.carbs * r,
    fat: food.fat * r,
  };
}

function macroScore(
  totals: { calories: number; protein: number; carbs: number; fat: number },
  target: { calories: number; protein: number; carbs: number; fat: number },
): number {
  // Lower = better. Normalized squared error.
  const dc = (totals.calories - target.calories) / Math.max(target.calories, 1);
  const dp = (totals.protein - target.protein) / Math.max(target.protein, 1);
  const dcb = (totals.carbs - target.carbs) / Math.max(target.carbs, 1);
  const df = (totals.fat - target.fat) / Math.max(target.fat, 1);
  return dc * dc * 2 + dp * dp + dcb * dcb + df * df;
}

function sumTotals(items: LoggedItem[]) {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + i.calories,
      protein: a.protein + i.protein,
      carbs: a.carbs + i.carbs,
      fat: a.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function buildMealCandidate(
  pool: FoodItem[],
  meal: MealType,
  mealCal: number,
  mealProtein: number,
  mealCarbs: number,
  mealFat: number,
  rnd: () => number,
): PlannedMeal {
  const [minItems, maxItems] = MEAL_ITEMS[meal];
  const count = minItems + Math.floor(rnd() * (maxItems - minItems + 1));
  const chosen: FoodItem[] = [];
  const used = new Set<string>();
  while (chosen.length < count && chosen.length < pool.length) {
    const f = pick(pool, rnd);
    if (used.has(f.id)) continue;
    used.add(f.id);
    chosen.push(f);
  }

  // Distribute calories across chosen with random weights, then convert to grams
  const weights = chosen.map(() => 0.5 + rnd());
  const wsum = weights.reduce((a, b) => a + b, 0);
  const items: LoggedItem[] = chosen.map((food, idx) => {
    const calForItem = mealCal * (weights[idx] / wsum);
    // grams needed
    const kcalPer100 = Math.max(food.calories, 1);
    let grams = (calForItem / kcalPer100) * 100;
    grams = Math.max(15, Math.min(grams, 350));
    grams = Math.round(grams / 5) * 5;
    return scaleItem(food, grams);
  });

  const totals = sumTotals(items);
  return { meal, items, totals };
}

function planMeal(
  meal: MealType,
  pool: FoodItem[],
  dayTarget: Targets,
  rnd: () => number,
): PlannedMeal {
  const share = MEAL_SPLIT[meal];
  const target = {
    calories: dayTarget.calories * share,
    protein: dayTarget.protein * share,
    carbs: dayTarget.carbs * share,
    fat: dayTarget.fat * share,
  };
  const mealPool = pool.filter((f) => f.meals.includes(meal));
  const source = mealPool.length >= 5 ? mealPool : pool;

  let best: PlannedMeal | null = null;
  let bestScore = Infinity;
  const tries = 40;
  for (let i = 0; i < tries; i++) {
    const cand = buildMealCandidate(
      source,
      meal,
      target.calories,
      target.protein,
      target.carbs,
      target.fat,
      rnd,
    );
    const s = macroScore(cand.totals, target);
    if (s < bestScore) {
      bestScore = s;
      best = cand;
    }
  }
  return best!;
}

export function generateMealPlan(
  targets: Targets,
  filters: HealthFilters,
  seed = Date.now(),
): MealPlan {
  const pool = FOODS.filter((f) => isFoodAllowed(f, filters));
  if (pool.length < 20) {
    throw new Error(
      "Not enough foods match your filters. Try loosening allergens or conditions.",
    );
  }
  const rnd = mulberry32(seed);
  const days: PlannedDay[] = [];
  const start = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const meals: PlannedMeal[] = (
      ["breakfast", "lunch", "dinner", "snacks"] as MealType[]
    ).map((m) => planMeal(m, pool, targets, rnd));
    const totals = sumTotals(meals.flatMap((m) => m.items));
    days.push({ date: date.toISOString().slice(0, 10), meals, totals });
  }
  return { generatedAt: Date.now(), filters, targets, days };
}

const PLAN_KEY = "dp.mealplan";

export function loadPlan(): MealPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as MealPlan) : null;
  } catch {
    return null;
  }
}

export function savePlan(plan: MealPlan) {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }
}

export function clearPlan() {
  if (typeof window !== "undefined") localStorage.removeItem(PLAN_KEY);
}
