import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf, RotateCcw, CalendarRange, ShoppingCart, Beaker, Info } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import { MacroBar } from "@/components/MacroBar";
import { MealSection } from "@/components/MealSection";
import { Button } from "@/components/ui/button";
import { sumDay, todayKey, useDayLog, useProfile } from "@/lib/storage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Today — NutriAI" },
      { name: "description", content: "Track your meals and stay on top of your daily calorie and macro goals." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { profile, targets, loaded, setProfile } = useProfile();
  const { log, addItem, removeItem } = useDayLog(todayKey());

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/onboarding" });
  }, [loaded, profile, navigate]);

  if (!profile || !targets) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  const totals = sumDay(log);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-bold tracking-tight">NutriAI</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/meal-plan">
                <CalendarRange className="mr-1.5 h-4 w-4" /> 7-day plan
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/grocery">
                <ShoppingCart className="mr-1.5 h-4 w-4" /> Grocery
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/explain">
                <Info className="mr-1.5 h-4 w-4" /> Explain
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/personas">
                <Beaker className="mr-1.5 h-4 w-4" /> Personas
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Reset your profile and start onboarding again?")) {
                  setProfile(null);
                  navigate({ to: "/onboarding" });
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          <h1 className="font-display text-3xl font-bold">Hi, {profile.name}.</h1>
        </div>

        <section className="grid gap-8 rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)] md:grid-cols-[auto_1fr] md:p-8">
          <div className="flex justify-center">
            <ProgressRing consumed={totals.calories} target={targets.calories} />
          </div>
          <div className="flex flex-col justify-center space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Today's macros</h2>
              <p className="text-xs text-muted-foreground">Updated as you log meals</p>
            </div>
            <MacroBar
              label="Protein"
              value={totals.protein}
              target={targets.protein}
              colorVar="var(--color-protein)"
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              target={targets.carbs}
              colorVar="var(--color-carbs)"
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              target={targets.fat}
              colorVar="var(--color-fat)"
            />
          </div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <MealSection meal="breakfast" title="Breakfast" icon="🌅" items={log.breakfast} onAdd={addItem} onRemove={removeItem} />
          <MealSection meal="lunch" title="Lunch" icon="🥗" items={log.lunch} onAdd={addItem} onRemove={removeItem} />
          <MealSection meal="dinner" title="Dinner" icon="🍽️" items={log.dinner} onAdd={addItem} onRemove={removeItem} />
          <MealSection meal="snacks" title="Snacks" icon="🍎" items={log.snacks} onAdd={addItem} onRemove={removeItem} />
        </div>
      </main>
    </div>
  );
}
