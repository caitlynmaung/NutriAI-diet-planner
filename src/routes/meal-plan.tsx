import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Leaf, Sparkles, RefreshCw, Clock, Plus, ArrowLeft, ThumbsUp, ThumbsDown, ShoppingCart, Shuffle, DollarSign } from "lucide-react";
import { useProfile, useDayLog, todayKey } from "@/lib/storage";
import {
  generateMealPlan,
  loadPlan,
  savePlan,
  type MealPlan,
  type PlannedMeal,
} from "@/lib/mealPlan";
import { dislike, like } from "@/lib/preferences";
import type { MealType } from "@/lib/storage";

export const Route = createFileRoute("/meal-plan")({
  head: () => ({
    meta: [
      { title: "7-Day Meal Plan — NutriAI" },
      { name: "description", content: "A personalized 7-day meal plan tuned to your goals, allergens, and clinical conditions." },
    ],
  }),
  component: MealPlanPage,
});

const MEAL_META: Record<MealType, { title: string; icon: string }> = {
  breakfast: { title: "Breakfast", icon: "🌅" },
  lunch:     { title: "Lunch",     icon: "🥗" },
  dinner:    { title: "Dinner",    icon: "🍽️" },
  snacks:    { title: "Snacks",    icon: "🍎" },
};

const WEEKDAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function MealPlanPage() {
  const navigate = useNavigate();
  const { profile, targets, loaded } = useProfile();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/onboarding" });
  }, [loaded, profile, navigate]);

  useEffect(() => {
    if (loaded) setPlan(loadPlan());
  }, [loaded]);

  const generate = () => {
    if (!profile || !targets) return;
    setBusy(true);
    setError(null);
    const started = performance.now();
    // run in next tick so UI can update
    setTimeout(() => {
      try {
        const next = generateMealPlan(
          targets,
          { diet: profile.diet, allergens: profile.allergens, conditions: profile.conditions },
        );
        savePlan(next);
        setPlan(next);
        setElapsed(performance.now() - started);
        setActiveDay(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not generate plan.");
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  if (!profile || !targets) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-bold tracking-tight">NutriAI</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Your 7-day meal plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalized to your {targets.calories} kcal target, {profile.diet} diet,
              {profile.allergens.length > 0 ? ` avoiding ${profile.allergens.join(", ")}, ` : " "}
              {profile.conditions.length > 0 ? `tuned for ${profile.conditions.join(", ")}.` : "and your goals."}
            </p>
          </div>
          <Button onClick={generate} disabled={busy} size="lg">
            {busy ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
            ) : plan ? (
              <><RefreshCw className="mr-2 h-4 w-4" /> Regenerate</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Generate plan</>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!plan && !busy && (
          <div className="rounded-3xl border-2 border-dashed bg-card/40 p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-xl font-semibold">No plan yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              We'll assemble 7 days of meals from 1,000+ USDA foods, matched to your
              targets in under a minute.
            </p>
          </div>
        )}

        {plan && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              <Chip icon={<Clock className="h-3.5 w-3.5" />} text={`Generated in ${(plan.generationMs/1000).toFixed(2)}s${elapsed !== null ? ` (UI: ${(elapsed/1000).toFixed(2)}s)` : ""}`} />
              <Chip icon={<Shuffle className="h-3.5 w-3.5" />} text={`Diversity ${plan.diversityScore}`} />
              <Chip icon={<DollarSign className="h-3.5 w-3.5" />} text={`$${plan.weeklyCost.toFixed(2)} / week`} />
              <Link to="/grocery" className="inline-flex items-center gap-1.5 rounded-full border bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
                <ShoppingCart className="h-3.5 w-3.5" /> Grocery list
              </Link>
              <Link to="/personas" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:border-primary/40">
                Run persona tests
              </Link>
            </div>

            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
              {plan.days.map((day, i) => {
                const d = new Date(day.date);
                const active = i === activeDay;
                return (
                  <button
                    key={day.date}
                    onClick={() => setActiveDay(i)}
                    className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 text-center transition ${
                      active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-widest opacity-80">
                      {WEEKDAY[d.getDay()]}
                    </span>
                    <span className="font-display text-lg font-bold leading-tight">{d.getDate()}</span>
                    <span className={`mt-1 text-[10px] ${active ? "opacity-80" : "text-muted-foreground"}`}>
                      {Math.round(day.totals.calories)} kcal
                    </span>
                  </button>
                );
              })}
            </div>

            <DayView day={plan.days[activeDay]} />
          </>
        )}
      </main>
    </div>
  );
}

function DayView({ day }: { day: MealPlan["days"][number] }) {
  const { addItem } = useDayLog(todayKey());
  const today = todayKey();
  const isToday = day.date === today;

  return (
    <div>
      <div className="mb-5 grid grid-cols-4 gap-3 rounded-2xl border bg-card p-4 text-center shadow-[var(--shadow-card)] sm:gap-6">
        <Stat label="Calories" value={`${Math.round(day.totals.calories)}`} unit="kcal" />
        <Stat label="Protein"  value={`${Math.round(day.totals.protein)}`}  unit="g" />
        <Stat label="Carbs"    value={`${Math.round(day.totals.carbs)}`}    unit="g" />
        <Stat label="Fat"      value={`${Math.round(day.totals.fat)}`}      unit="g" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {day.meals.map((m) => (
          <PlannedMealCard
            key={m.meal}
            meal={m}
            onLog={isToday ? (i) => addItem(m.meal, { ...i, id: crypto.randomUUID() }) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function PlannedMealCard({
  meal,
  onLog,
}: {
  meal: PlannedMeal;
  onLog?: (item: PlannedMeal["items"][number]) => void;
}) {
  const meta = MEAL_META[meal.meal];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-lg">{meta.icon}</span>
          <div>
            <h3 className="font-display text-base font-semibold">{meta.title}</h3>
            <p className="text-xs text-muted-foreground">
              {Math.round(meal.totals.calories)} kcal · P{Math.round(meal.totals.protein)} · C{Math.round(meal.totals.carbs)} · F{Math.round(meal.totals.fat)}
            </p>
          </div>
        </div>
      </header>
      <ul className="divide-y">
        {meal.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0 pr-3">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {item.amount}{item.unit === "piece" ? " pc" : item.unit} · {Math.round(item.calories)} kcal
              </div>
            </div>
            <div className="flex items-center gap-1">
              <FeedbackButton foodId={item.foodId} kind="like" />
              <FeedbackButton foodId={item.foodId} kind="dislike" />
              {onLog && (
                <button
                  onClick={() => onLog(item)}
                  className="ml-1 rounded-md p-1.5 text-primary transition hover:bg-primary-soft"
                  aria-label="Log to today"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeedbackButton({ foodId, kind }: { foodId: string; kind: "like" | "dislike" }) {
  const [active, setActive] = useState(false);
  const Icon = kind === "like" ? ThumbsUp : ThumbsDown;
  return (
    <button
      onClick={() => {
        if (kind === "like") like(foodId); else dislike(foodId);
        setActive(true);
        setTimeout(() => setActive(false), 600);
      }}
      className={`rounded-md p-1.5 transition ${active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted"}`}
      aria-label={kind === "like" ? "More like this" : "Avoid this"}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-primary-soft px-3 py-1 text-xs text-primary">
      {icon}{text}
    </span>
  );
}
