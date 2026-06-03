import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Leaf, Search, ShieldX, ShieldCheck, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FOODS,
  explainExclusion,
  rdaFor,
  type FoodItem,
  type HealthFilters,
} from "@/lib/foods";
import { loadPlan } from "@/lib/mealPlan";
import { useProfile } from "@/lib/storage";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "Explain & Analytics — NutriAI" },
      {
        name: "description",
        content:
          "For any flagged or excluded food, NutriAI shows exactly why it was removed and benchmarks daily nutrients against age/sex-tailored RDA.",
      },
    ],
  }),
  component: ExplainPage,
});

function ExplainPage() {
  const { profile } = useProfile();
  const plan = loadPlan();
  const [q, setQ] = useState("");

  const filters: HealthFilters = useMemo(
    () => ({
      diet: profile?.diet ?? "omnivore",
      allergens: profile?.allergens ?? [],
      conditions: profile?.conditions ?? [],
    }),
    [profile],
  );

  const rda = useMemo(
    () => rdaFor({ age: profile?.age ?? 35, sex: profile?.sex ?? "female" }),
    [profile],
  );

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [] as FoodItem[];
    return FOODS.filter((f) => f.name.toLowerCase().includes(needle)).slice(0, 25);
  }, [q]);

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

      <main className="mx-auto max-w-5xl space-y-10 px-5 py-8">
        <section>
          <h1 className="font-display text-3xl font-bold">Explain a food</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Search any of the {FOODS.length.toLocaleString()} foods in the catalogue. NutriAI
            will tell you whether it's allowed for your current profile — and if not, every
            reason it was excluded (FODMAP, allergens, sodium, GI, cross-contamination, …).
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “garlic”, “shrimp”, “whole milk”, “bagel”…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            {q && (
              <Button variant="ghost" size="sm" onClick={() => setQ("")}>
                Clear
              </Button>
            )}
          </div>

          {matches.length > 0 && (
            <ul className="mt-4 divide-y rounded-2xl border bg-card">
              {matches.map((food) => {
                const reasons = explainExclusion(food, filters);
                const ok = reasons.length === 0;
                return (
                  <li key={food.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      {ok ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      )}
                      <div>
                        <div className="font-medium leading-snug">{food.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {food.category} · {food.calories} kcal · {food.protein}P / {food.carbs}C / {food.fat}F per 100{food.unit}
                          {food.gi > 0 ? ` · GI ${food.gi}` : ""}
                          {food.sodium > 0 ? ` · ${Math.round(food.sodium)} mg Na` : ""}
                        </div>
                        {!ok && (
                          <ul className="mt-2 space-y-1">
                            {reasons.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Nutrient analytics ------------------------------------------------ */}
        <section>
          <h2 className="font-display text-2xl font-bold">Nutrient analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            RDA tailored for {profile ? `${profile.sex}, age ${profile.age}` : "an adult"}.
            Days falling below 80% of RDA are flagged.
          </p>

          {!plan ? (
            <div className="mt-4 rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
              Generate a 7-day plan first to see analytics here.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2 text-right">kcal</th>
                    <th className="px-3 py-2 text-right">Fibre</th>
                    <th className="px-3 py-2 text-right">Iron</th>
                    <th className="px-3 py-2 text-right">Calcium</th>
                    <th className="px-3 py-2 text-right">B12</th>
                    <th className="px-3 py-2 text-right">Potassium</th>
                    <th className="px-3 py-2 text-right">Sodium</th>
                    <th className="px-3 py-2">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.days.map((d, i) => {
                    const flags: string[] = [];
                    const pct = (v: number, rdaV: number) => v / rdaV;
                    const checks: [string, number, number][] = [
                      ["fibre", d.micros.fiber, rda.fiber],
                      ["iron", d.micros.iron, rda.iron],
                      ["calcium", d.micros.calcium, rda.calcium],
                      ["B12", d.micros.b12, rda.b12],
                      ["potassium", d.micros.potassium, rda.potassium],
                    ];
                    for (const [k, v, r] of checks) if (pct(v, r) < 0.8) flags.push(k);
                    if (d.micros.sodium > rda.sodium) flags.push("sodium↑");
                    return (
                      <tr key={d.date} className="border-t">
                        <td className="px-3 py-2 font-medium">Day {i + 1}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Math.round(d.totals.calories)}</td>
                        <Cell value={d.micros.fiber} rda={rda.fiber} unit="g" />
                        <Cell value={d.micros.iron} rda={rda.iron} unit="mg" />
                        <Cell value={d.micros.calcium} rda={rda.calcium} unit="mg" />
                        <Cell value={d.micros.b12} rda={rda.b12} unit="µg" decimals={1} />
                        <Cell value={d.micros.potassium} rda={rda.potassium} unit="mg" />
                        <td className={`px-3 py-2 text-right tabular-nums ${d.micros.sodium > rda.sodium ? "text-destructive" : ""}`}>
                          {Math.round(d.micros.sodium)} mg
                        </td>
                        <td className="px-3 py-2 text-xs text-amber-700">
                          {flags.length === 0 ? <span className="text-primary">✓ on target</span> : `< 80%: ${flags.join(", ")}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Cell({ value, rda, unit, decimals = 0 }: { value: number; rda: number; unit: string; decimals?: number }) {
  const pct = value / rda;
  const low = pct < 0.8;
  return (
    <td className={`px-3 py-2 text-right tabular-nums ${low ? "text-destructive" : ""}`}>
      {value.toFixed(decimals)} {unit}
      <span className="ml-1 text-[10px] text-muted-foreground">{Math.round(pct * 100)}%</span>
    </td>
  );
}
