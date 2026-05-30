import { useEffect, useState } from "react";
import type { Profile, Targets } from "./nutrition";
import { calculateTargets } from "./nutrition";

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type LoggedItem = {
  id: string; // unique log id
  foodId: string;
  name: string;
  unit: "g" | "ml" | "piece";
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DayLog = Record<MealType, LoggedItem[]>;

const PROFILE_KEY = "dp.profile";
const LOG_KEY_PREFIX = "dp.log.";

function emptyDay(): DayLog {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = read<Profile | null>(PROFILE_KEY, null);
    if (stored) {
      // backfill defaults for older profiles missing the health fields
      stored.diet = stored.diet ?? "omnivore";
      stored.allergens = stored.allergens ?? [];
      stored.conditions = stored.conditions ?? [];
    }
    setProfileState(stored);
    setLoaded(true);
  }, []);

  const setProfile = (p: Profile | null) => {
    setProfileState(p);
    if (typeof window !== "undefined") {
      if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      else localStorage.removeItem(PROFILE_KEY);
    }
  };

  const targets: Targets | null = profile ? calculateTargets(profile) : null;

  return { profile, setProfile, targets, loaded };
}

export function useDayLog(dateKey: string) {
  const [log, setLog] = useState<DayLog>(emptyDay());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLog(read<DayLog>(LOG_KEY_PREFIX + dateKey, emptyDay()));
    setLoaded(true);
  }, [dateKey]);

  const persist = (next: DayLog) => {
    setLog(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOG_KEY_PREFIX + dateKey, JSON.stringify(next));
    }
  };

  const addItem = (meal: MealType, item: LoggedItem) => {
    persist({ ...log, [meal]: [...log[meal], item] });
  };

  const removeItem = (meal: MealType, id: string) => {
    persist({ ...log, [meal]: log[meal].filter((i) => i.id !== id) });
  };

  return { log, addItem, removeItem, loaded };
}

export function sumMacros(items: LoggedItem[]) {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function sumDay(log: DayLog) {
  return sumMacros([...log.breakfast, ...log.lunch, ...log.dinner, ...log.snacks]);
}
