// Adaptive learning: stores user food feedback (likes/dislikes) and exposes
// a scoring boost used by the meal plan generator. The longer the user uses
// NutriAI, the better tuned future plans become.

const KEY = "dp.prefs.v1";

export type Prefs = {
  liked: Record<string, number>;    // foodId -> count of likes
  disliked: Record<string, number>; // foodId -> count of dislikes
};

function empty(): Prefs {
  return { liked: {}, disliked: {} };
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Prefs) } : empty();
  } catch {
    return empty();
  }
}

export function savePrefs(p: Prefs) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(p));
}

export function like(foodId: string) {
  const p = loadPrefs();
  p.liked[foodId] = (p.liked[foodId] ?? 0) + 1;
  p.disliked[foodId] = Math.max(0, (p.disliked[foodId] ?? 0) - 1);
  savePrefs(p);
}

export function dislike(foodId: string) {
  const p = loadPrefs();
  p.disliked[foodId] = (p.disliked[foodId] ?? 0) + 1;
  p.liked[foodId] = Math.max(0, (p.liked[foodId] ?? 0) - 1);
  savePrefs(p);
}

// Returns a multiplicative weight for ranking. >1 means "prefer", <1 means "avoid".
export function preferenceWeight(foodId: string, p: Prefs = loadPrefs()): number {
  const l = p.liked[foodId] ?? 0;
  const d = p.disliked[foodId] ?? 0;
  // Logistic-ish in [0.3, 2.0]
  const delta = l - d;
  if (delta === 0) return 1;
  if (delta > 0) return Math.min(2.0, 1 + 0.25 * delta);
  return Math.max(0.3, 1 + 0.25 * delta);
}
