import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShoppingCart, DollarSign, Package, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/storage";
import { generateMealPlan, loadPlan, savePlan, type MealPlan } from "@/lib/mealPlan";
import { buildGroceryList } from "@/lib/grocery";

export const Route = createFileRoute("/grocery")({
  head: () => ({
    meta: [
      { title: "Grocery List — NutriAI" },
      { name: "description", content: "Weekly grocery list consolidated from your 7-day meal plan with cost estimate." },
    ],
  }),
  component: GroceryPage,
});

function GroceryPage() {
  const navigate = useNavigate();
  const { profile, targets, loaded } = useProfile();
  const [plan, setPlan] = useState<MealPlan | null>(null);

  useEffect(() => { if (loaded && !profile) navigate({ to: "/onboarding" }); }, [loaded, profile, navigate]);
  useEffect(() => { if (loaded) setPlan(loadPlan()); }, [loaded]);

  const generateIfMissing = () => {
    if (!profile || !targets) return;
    const next = generateMealPlan(targets, {
      diet: profile.diet, allergens: profile.allergens, conditions: profile.conditions,
    });
    savePlan(next); setPlan(next);
  };

  const list = useMemo(() => (plan ? buildGroceryList(plan) : null), [plan]);

  if (!profile || !targets) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/meal-plan" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Meal plan
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
            <h1 className="font-display text-3xl font-bold">Weekly grocery list</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every ingredient from your 7-day plan, consolidated and costed.
            </p>
          </div>
          {!plan && (
            <Button size="lg" onClick={generateIfMissing}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Generate from plan
            </Button>
          )}
        </div>

        {!list && (
          <div className="rounded-3xl border-2 border-dashed bg-card/40 p-12 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-xl font-semibold">No plan yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Generate your 7-day meal plan first — we'll roll every ingredient into one shopping list.
            </p>
            <Button className="mt-5" onClick={generateIfMissing}>Build my plan</Button>
          </div>
        )}

        {list && (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <Stat icon={<Package className="h-4 w-4" />} label="Unique items" value={`${list.itemCount}`} />
              <Stat icon={<ShoppingCart className="h-4 w-4" />} label="Total grams" value={`${Math.round(list.items.reduce((a, i) => a + i.totalGrams, 0)).toLocaleString()} g`} />
              <Stat icon={<DollarSign className="h-4 w-4" />} label="Est. weekly cost" value={`$${list.totalCost.toFixed(2)}`} highlight />
            </div>

            <div className="space-y-5">
              {Object.entries(list.byCategory).map(([cat, items]) => (
                <section key={cat} className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                  <header className="flex items-center justify-between border-b bg-primary-soft/40 px-5 py-3">
                    <h3 className="font-display text-sm font-semibold tracking-wide text-primary">{cat}</h3>
                    <span className="text-xs text-muted-foreground">
                      {items.length} item{items.length === 1 ? "" : "s"} · ${items.reduce((a, i) => a + i.estCost, 0).toFixed(2)}
                    </span>
                  </header>
                  <ul className="divide-y">
                    {items.map((i) => (
                      <li key={i.key} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0 pr-3">
                          <div className="truncate text-sm font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.totalGrams >= 1000 ? `${(i.totalGrams/1000).toFixed(2)} kg` : `${Math.round(i.totalGrams)} g`}
                          </div>
                        </div>
                        <div className="font-display tabular-nums text-sm font-semibold">${i.estCost.toFixed(2)}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-[var(--shadow-card)] ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`flex items-center gap-2 text-xs uppercase tracking-widest ${highlight ? "opacity-80" : "text-muted-foreground"}`}>
        {icon}{label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
