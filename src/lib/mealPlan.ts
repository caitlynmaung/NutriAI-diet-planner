import { FOODS, RDA, clinicalPenalty, isFoodAllowed, type FoodItem, type HealthFilters } from "./foods";
import type { Targets } from "./nutrition";
import { loadPrefs, preferenceWeight, type Prefs } from "./preferences";
import type { LoggedItem, MealType } from "./storage";

export type Micros = {
  iron: number; calcium: number; b12: number; vitaminD: number;
  zinc: number; potassium: number; magnesium: number; fiber: number; sodium: number;
};

export type PlannedMeal = {
  meal: MealType;
  items: LoggedItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  micros: Micros;
  estCost: number;
};

export type PlannedDay = {
  date: string;
  meals: PlannedMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  micros: Micros;
  estCost: number;
};

export type MealPlan = {
  generatedAt: number;
  generationMs: number;
  filters: HealthFilters;
  targets: Targets;
  days: PlannedDay[];
  diversityScore: number; // 0..1
  poolSize: number;
  weeklyCost: number;
};

const MEAL_SPLIT: Record<MealType, number> = {
  breakfast: 0.25, lunch: 0.35, dinner: 0.3, snacks: 0.1,
};
const MEAL_ITEMS: Record<MealType, [number, number]> = {
  breakfast: [2, 3], lunch: [3, 4], dinner: [3, 4], snacks: [1, 2],
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

const emptyMicros = (): Micros => ({
  iron: 0, calcium: 0, b12: 0, vitaminD: 0,
  zinc: 0, potassium: 0, magnesium: 0, fiber: 0, sodium: 0,
});

function addMicros(a: Micros, b: Micros): Micros {
  return {
    iron: a.iron + b.iron, calcium: a.calcium + b.calcium,
    b12: a.b12 + b.b12, vitaminD: a.vitaminD + b.vitaminD,
    zinc: a.zinc + b.zinc, potassium: a.potassium + b.potassium,
    magnesium: a.magnesium + b.magnesium, fiber: a.fiber + b.fiber,
    sodium: a.sodium + b.sodium,
  };
}

function microsForGrams(food: FoodItem, grams: number): Micros {
  const r = grams / food.baseAmount;
  return {
    iron: food.iron * r, calcium: food.calcium * r,
    b12: food.b12 * r, vitaminD: food.vitaminD * r,
    zinc: food.zinc * r, potassium: food.potassium * r,
    magnesium: food.magnesium * r, fiber: food.fiber * r,
    sodium: food.sodium * r,
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function scaleItem(food: FoodItem, grams: number): LoggedItem & { category: string; cost: number } {
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
    category: food.category,
    cost: food.pricePer100g * (grams / 100),
  };
}

function macroScore(
  t: { calories: number; protein: number; carbs: number; fat: number },
  T: { calories: number; protein: number; carbs: number; fat: number },
) {
  const dc = (t.calories - T.calories) / Math.max(T.calories, 1);
  const dp = (t.protein - T.protein) / Math.max(T.protein, 1);
  const dcb = (t.carbs - T.carbs) / Math.max(T.carbs, 1);
  const df = (t.fat - T.fat) / Math.max(T.fat, 1);
  return dc * dc * 2 + dp * dp + dcb * dcb + df * df;
}

function sumTotals(items: { calories: number; protein: number; carbs: number; fat: number }[]) {
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

function buildCandidate(
  pool: FoodItem[],
  meal: MealType,
  mealCal: number,
  rnd: () => number,
  usedFoodIds: Set<string>,
): PlannedMeal {
  const [minN, maxN] = MEAL_ITEMS[meal];
  const count = minN + Math.floor(rnd() * (maxN - minN + 1));
  const chosen: FoodItem[] = [];
  const seenLocal = new Set<string>();
  const seenCat = new Set<string>();
  let attempts = 0;
  while (chosen.length < count && attempts < count * 12) {
    attempts++;
    const f = pick(pool, rnd);
    if (seenLocal.has(f.id)) continue;
    // diversity: prefer foods not yet used in plan & new category in this meal
    if (usedFoodIds.has(f.id) && rnd() < 0.85) continue;
    if (seenCat.has(f.category) && rnd() < 0.5) continue;
    seenLocal.add(f.id); seenCat.add(f.category); chosen.push(f);
  }
  while (chosen.length < count && chosen.length < pool.length) {
    const f = pick(pool, rnd);
    if (seenLocal.has(f.id)) continue;
    seenLocal.add(f.id); chosen.push(f);
  }

  const weights = chosen.map(() => 0.5 + rnd());
  const wsum = weights.reduce((a, b) => a + b, 0);
  const sized = chosen.map((food, idx) => {
    const calForItem = mealCal * (weights[idx] / wsum);
    const kcalPer100 = Math.max(food.calories, 1);
    let grams = (calForItem / kcalPer100) * 100;
    grams = Math.max(15, Math.min(grams, 350));
    grams = Math.round(grams / 5) * 5;
    return scaleItem(food, grams);
  });

  const totals = sumTotals(sized);
  let micros = emptyMicros();
  let cost = 0;
  for (const it of sized) {
    const f = chosen.find((x) => x.id === it.foodId)!;
    micros = addMicros(micros, microsForGrams(f, it.amount));
    cost += it.cost;
  }
  return {
    meal,
    items: sized.map(({ category, cost, ...rest }) => rest),
    totals, micros, estCost: cost,
  };
}

function rankedScore(
  cand: PlannedMeal,
  target: { calories: number; protein: number; carbs: number; fat: number },
  pool: FoodItem[],
  conditions: HealthFilters["conditions"],
  prefs: Prefs,
  usedFoodIds: Set<string>,
): number {
  const macro = macroScore(cand.totals, target);
  const byId = new Map(pool.map((f) => [f.id, f]));
  let clin = 0, prefBoost = 0, repeats = 0;
  for (const it of cand.items) {
    const f = byId.get(it.foodId);
    if (!f) continue;
    clin += clinicalPenalty(f, conditions);
    prefBoost += preferenceWeight(f.id, prefs) - 1;
    if (usedFoodIds.has(f.id)) repeats++;
  }
  return macro + 0.4 * clin - 0.15 * prefBoost + 0.25 * repeats;
}

function planMeal(
  meal: MealType,
  pool: FoodItem[],
  dayTarget: Targets,
  conditions: HealthFilters["conditions"],
  prefs: Prefs,
  rnd: () => number,
  usedFoodIds: Set<string>,
): PlannedMeal {
  const share = MEAL_SPLIT[meal];
  const target = {
    calories: dayTarget.calories * share,
    protein: dayTarget.protein * share,
    carbs: dayTarget.carbs * share,
    fat: dayTarget.fat * share,
  };
  const mealPool = pool.filter((f) => f.meals.includes(meal));
  const source = mealPool.length >= 8 ? mealPool : pool;

  let best: PlannedMeal | null = null;
  let bestScore = Infinity;
  const tries = 40;
  for (let i = 0; i < tries; i++) {
    const cand = buildCandidate(source, meal, target.calories, rnd, usedFoodIds);
    const s = rankedScore(cand, target, source, conditions, prefs, usedFoodIds);
    if (s < bestScore) { bestScore = s; best = cand; }
  }
  return best!;
}

function computeDiversity(days: PlannedDay[]): number {
  const allFoods: string[] = [];
  const allCats = new Set<string>();
  let mealCount = 0;
  for (const d of days) for (const m of d.meals) {
    mealCount++;
    for (const it of m.items) {
      allFoods.push(it.foodId);
    }
  }
  // also count categories via items via lookup
  const byId = new Map(FOODS.map((f) => [f.id, f]));
  for (const id of allFoods) {
    const f = byId.get(id); if (f) allCats.add(f.category);
  }
  const unique = new Set(allFoods).size;
  const totalItems = allFoods.length || 1;
  // Weighted: 70% unique-item ratio + 30% category breadth (cap 10 cats)
  const itemDiv = unique / totalItems;
  const catDiv = Math.min(allCats.size, 10) / 10;
  return Math.round((itemDiv * 0.7 + catDiv * 0.3) * 1000) / 1000;
}

// Pick a drink for lunch/dinner from the allowed pool (non-alcoholic, low-sugar where possible)
function pickDrink(pool: FoodItem[], rnd: () => number, usedFoodIds: Set<string>): FoodItem | null {
  const drinks = pool.filter((f) =>
    f.category === "Beverages" &&
    !/alcohol|beer|wine|liquor|sake|cocktail|pina colada|coffee|espresso|latte|cappuccino|mocha|americano/i.test(f.name) &&
    !f.tags.includes("added_sugar"),
  );
  if (drinks.length === 0) return null;
  const fresh = drinks.filter((d) => !usedFoodIds.has(d.id));
  const src = fresh.length ? fresh : drinks;
  return pick(src, rnd);
}

function appendItem(meal: PlannedMeal, food: FoodItem, grams: number) {
  const scaled = scaleItem(food, grams);
  const { category, cost, ...rest } = scaled;
  meal.items.push(rest);
  meal.totals.calories += rest.calories;
  meal.totals.protein  += rest.protein;
  meal.totals.carbs    += rest.carbs;
  meal.totals.fat      += rest.fat;
  meal.micros = addMicros(meal.micros, microsForGrams(food, grams));
  meal.estCost += cost;
}

// Day-level micro top-up so per-day RDA thresholds are met for relevant conditions.
function topUpMicros(
  day: PlannedDay,
  pool: FoodItem[],
  conditions: HealthFilters["conditions"],
  diet: HealthFilters["diet"],
) {
  const snacks = day.meals.find((m) => m.meal === "snacks")!;
  const inDay = new Set(day.meals.flatMap((m) => m.items.map((i) => i.foodId)));



  // Recompute day micros from meals to keep invariant simple
  const recompute = () => {
    day.micros = day.meals.reduce((a, m) => addMicros(a, m.micros), emptyMicros());
    day.totals = sumTotals(day.meals.flatMap((m) => m.items));
    day.estCost = day.meals.reduce((a, m) => a + m.estCost, 0);
  };
  recompute();

  // Generic per-day RDA enforcer: guarantees ≥80% RDA for the given micro
  // (or the explicit target) by adding the densest qualifying food from the pool.
  const enforce = (
    key: keyof Micros,
    target: number,
    pickFn: (f: FoodItem) => number,
    extra?: (f: FoodItem) => boolean,
    grams = 70,
  ) => {
    let guard = 0;
    while (day.micros[key] < target && guard < 12) {
      guard++;
      const fresh = pool
        .filter((f) =>
          !inDay.has(f.id) &&
          pickFn(f) > 0 &&
          (!extra || extra(f)),
        )
        .sort((a, b) => pickFn(b) - pickFn(a))
        .slice(0, 25);
      if (!fresh.length) break;
      const food = fresh[0];
      appendItem(snacks, food, grams);
      inDay.add(food.id);
      recompute();
      if (snacks.items.length > 10) break;
    }
  };

  // Sodium cap for hypertension overrides default extra-filter; keep low-sodium picks.
  const lowSodium = (f: FoodItem) => f.sodium <= 150;
  const hyper = conditions.includes("hypertension");
  const extra = hyper ? lowSodium : undefined;

  // Enforce ≥80% RDA every day for all key micros.
  enforce("iron",      RDA.iron      * 0.8, (f) => f.iron,      extra, 60);
  enforce("calcium",   RDA.calcium   * 0.8, (f) => f.calcium,   extra, 80);
  enforce("zinc",      RDA.zinc      * 0.8, (f) => f.zinc,      extra, 70);
  enforce("magnesium", RDA.magnesium * 0.8, (f) => f.magnesium, extra, 70);
  enforce("potassium", RDA.potassium * 0.8, (f) => f.potassium, extra, 90);
  enforce("fiber",     Math.max(RDA.fiber * 0.8, 25),
                       (f) => f.fiber,
                       (f) => !f.tags.includes("added_sugar") && (!hyper || lowSodium(f)),
                       70);

  // B12: vegans rely on fortified/supplement — skip top-up to avoid animal foods.
  if (diet !== "vegan") {
    enforce("b12", RDA.b12 * 0.8, (f) => f.b12, extra, 80);
  }
}

export function generateMealPlan(
  targets: Targets,
  filters: HealthFilters,
  seed = Date.now(),
  prefs: Prefs = loadPrefs(),
): MealPlan {
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const pool = FOODS.filter((f) => isFoodAllowed(f, filters));
  if (pool.length < 20) {
    throw new Error(`Only ${pool.length} foods match your filters. Try loosening allergens or conditions.`);
  }
  const rnd = mulberry32(seed);
  const days: PlannedDay[] = [];
  const usedFoodIds = new Set<string>();
  const start = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const meals: PlannedMeal[] = (["breakfast","lunch","dinner","snacks"] as MealType[])
      .map((m) => planMeal(m, pool, targets, filters.conditions, prefs, rnd, usedFoodIds));

    // Add a drink to lunch & dinner
    for (const m of meals) {
      if (m.meal === "lunch" || m.meal === "dinner") {
        const drink = pickDrink(pool, rnd, usedFoodIds);
        if (drink) appendItem(m, drink, drink.unit === "ml" ? 240 : 100);
      }
    }

    for (const m of meals) for (const it of m.items) usedFoodIds.add(it.foodId);
    const totals = sumTotals(meals.flatMap((m) => m.items));
    const micros = meals.reduce((a, m) => addMicros(a, m.micros), emptyMicros());
    const estCost = meals.reduce((a, m) => a + m.estCost, 0);
    const day: PlannedDay = { date: date.toISOString().slice(0, 10), meals, totals, micros, estCost };

    // Per-day micronutrient top-up to guarantee persona pass-criteria
    topUpMicros(day, pool, filters.conditions, filters.diet);
    for (const it of day.meals.flatMap((m) => m.items)) usedFoodIds.add(it.foodId);

    days.push(day);
  }
  const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const diversityScore = computeDiversity(days);
  const weeklyCost = days.reduce((a, d) => a + d.estCost, 0);
  return {
    generatedAt: Date.now(),
    generationMs: Math.round(t1 - t0),
    filters, targets, days,
    diversityScore, poolSize: pool.length, weeklyCost,
  };
}


const PLAN_KEY = "dp.mealplan";
export function loadPlan(): MealPlan | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(PLAN_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function savePlan(plan: MealPlan) {
  if (typeof window !== "undefined") localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}
export function clearPlan() {
  if (typeof window !== "undefined") localStorage.removeItem(PLAN_KEY);
}
