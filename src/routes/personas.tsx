import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Leaf, CheckCircle2, XCircle, PlayCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMealPlan, type MealPlan } from "@/lib/mealPlan";
import { FOODS, RDA, type Allergen, type Condition, type DietTag } from "@/lib/foods";
import type { Targets } from "@/lib/nutrition";

export const Route = createFileRoute("/personas")({
  head: () => ({
    meta: [
      { title: "Persona Tests — NutriAI" },
      { name: "description", content: "Runs the 4 BAX-423 personas (Priya / Ravi / Mei / James) through the meal-plan generator and reports pass/fail against each persona's clinical criteria." },
    ],
  }),
  component: PersonasPage,
});

type Persona = {
  id: string;
  name: string;
  blurb: string;
  diet: DietTag;
  allergens: Allergen[];
  conditions: Exclude<Condition, "none">[];
  excludeTags?: string[];
  kcal: number;
  /** human-readable pass criteria */
  criteria: string[];
  /** functional check returning pass/fail per criterion */
  check: (p: MealPlan) => { label: string; pass: boolean; detail: string }[];
};

function targetsFromKcal(kcal: number, conds: Condition[]): Targets {
  let pPct = 0.3, fPct = 0.25, cPct = 0.45;
  if (conds.includes("diabetes"))         { cPct = 0.35; fPct = 0.30; pPct = 0.35; }
  if (conds.includes("high_cholesterol")) { fPct = Math.min(fPct, 0.25); }
  if (conds.includes("ckd"))              { pPct = 0.15; cPct = 0.55; fPct = 0.30; }
  if (conds.includes("gerd"))             { fPct = Math.min(fPct, 0.25); }
  const s = pPct + fPct + cPct; pPct/=s; fPct/=s; cPct/=s;
  return {
    calories: kcal,
    protein: Math.round((kcal * pPct) / 4),
    fat:     Math.round((kcal * fPct) / 9),
    carbs:   Math.round((kcal * cPct) / 4),
  };
}

// Helpers reused inside checks ---------------------------------------------
const byId = new Map(FOODS.map((f) => [f.id, f]));
function planFoods(p: MealPlan) {
  return p.days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => byId.get(i.foodId)!).filter(Boolean)));
}
function dailyMicro(p: MealPlan, key: "iron"|"calcium"|"b12"|"vitaminD"|"zinc"|"potassium"|"magnesium"|"fiber"|"sodium") {
  return p.days.map((d) => d.micros[key]);
}
function dailySodium(p: MealPlan) { return dailyMicro(p, "sodium"); }
function dailyFiber(p: MealPlan)  { return dailyMicro(p, "fiber"); }

const PERSONAS: Persona[] = [
  {
    id: "priya",
    name: "Priya — IBS · Vegetarian · Lactose-intolerant",
    blurb: "IBS-D. Vegetarian (eggs OK). Lactose intolerant. 1,800 kcal/day.",
    diet: "vegetarian",
    allergens: ["dairy"],
    conditions: ["ibs"],
    kcal: 1800,
    criteria: [
      "Zero high-FODMAP trigger foods",
      "Zero dairy / lactose",
      "All 7 days meatless",
      "Iron ≥ 80% RDA daily",
    ],
    check: (p) => {
      const foods = planFoods(p);
      const fodmap = foods.filter((f) => f.tags.includes("high_fodmap")).length;
      const dairy  = foods.filter((f) => f.tags.includes("lactose") || f.allergens.includes("dairy")).length;
      const meat   = foods.filter((f) => ["beef","pork","poultry","fish","seafood"].some((t) => f.tags.includes(t))).length;
      const ironDays = dailyMicro(p, "iron");
      const ironPct  = ironDays.map((v) => v / RDA.iron);
      const ironOk   = ironPct.every((v) => v >= 0.8);
      return [
        { label: "Zero high-FODMAP foods",    pass: fodmap === 0, detail: `${fodmap} found` },
        { label: "Zero dairy / lactose",       pass: dairy === 0,  detail: `${dairy} found` },
        { label: "All 7 days meatless",        pass: meat === 0,   detail: `${meat} meat items` },
        { label: "Iron ≥ 80% RDA daily",       pass: ironOk,       detail: `min ${(Math.min(...ironPct)*100).toFixed(0)}% RDA` },
      ];
    },
  },
  {
    id: "ravi",
    name: "Ravi — GERD · Non-veg · Gluten-free",
    blurb: "GERD (acid reflux). Non-veg (no pork). Strict gluten-free. 2,200 kcal/day.",
    diet: "omnivore",
    allergens: ["gluten"],
    excludeTags: ["pork"],
    conditions: ["gerd"],
    kcal: 2200,
    criteria: [
      "Zero GERD trigger foods",
      "Zero gluten (cross-contamination filter)",
      "Diversity score ≥ 0.7",
      "B12 ≥ 80% RDA daily",
    ],
    check: (p) => {
      const foods = planFoods(p);
      const triggers = foods.filter((f) => f.tags.includes("gerd_trigger")).length;
      const gluten   = foods.filter((f) => f.allergens.includes("gluten") || f.tags.includes("contains_gluten") || f.tags.includes("gluten_cc_risk")).length;
      const pork     = foods.filter((f) => f.tags.includes("pork")).length;
      const b12Days  = dailyMicro(p, "b12").map((v) => v / RDA.b12);
      const b12Ok    = b12Days.every((v) => v >= 0.8);
      return [
        { label: "Zero GERD triggers",   pass: triggers === 0,            detail: `${triggers} triggers` },
        { label: "Zero gluten",          pass: gluten === 0 && pork === 0, detail: `${gluten} gluten / ${pork} pork` },
        { label: "Diversity score ≥ 0.7", pass: p.diversityScore >= 0.7,  detail: `score ${p.diversityScore}` },
        { label: "B12 ≥ 80% RDA daily",  pass: b12Ok,                     detail: `min ${(Math.min(...b12Days)*100).toFixed(0)}% RDA` },
      ];
    },
  },
  {
    id: "mei",
    name: "Mei — Type 2 Diabetes · Vegan · Tree-nut allergy",
    blurb: "T2D, prioritise low-GI (≤55), high fibre. Vegan. Tree-nut allergy. 1,600 kcal/day.",
    diet: "vegan",
    allergens: ["tree_nuts"],
    conditions: ["diabetes"],
    kcal: 1600,
    criteria: [
      "All foods GI ≤ 55",
      "Zero animal products",
      "Zero tree nuts",
      "Fibre ≥ 25 g/day",
    ],
    check: (p) => {
      const foods = planFoods(p);
      const highGi = foods.filter((f) => f.gi > 55).length;
      const animal = foods.filter((f) => f.diet !== "vegan").length;
      const nuts   = foods.filter((f) => f.allergens.includes("tree_nuts")).length;
      const fiber  = dailyFiber(p);
      const fibOk  = fiber.every((v) => v >= 25);
      return [
        { label: "All foods GI ≤ 55",  pass: highGi === 0, detail: `${highGi} high-GI` },
        { label: "Zero animal products", pass: animal === 0, detail: `${animal} non-vegan` },
        { label: "Zero tree nuts",     pass: nuts === 0,   detail: `${nuts} items` },
        { label: "Fibre ≥ 25 g/day",   pass: fibOk,        detail: `min ${Math.min(...fiber).toFixed(0)} g` },
      ];
    },
  },
  {
    id: "james",
    name: "James — Hypertension · Pescatarian · Soy allergy",
    blurb: "DASH diet, low sodium ≤1500 mg/day. Pescatarian. Soy allergy. 2,000 kcal/day.",
    diet: "pescatarian",
    allergens: ["soy"],
    conditions: ["hypertension"],
    kcal: 2000,
    criteria: [
      "Sodium ≤ 1500 mg every day",
      "Zero soy",
      "≥ 3 fish/seafood meals across the week",
      "Potassium ≥ 80% RDA daily",
    ],
    check: (p) => {
      const foods = planFoods(p);
      const sodium = dailySodium(p);
      const sodOk  = sodium.every((v) => v <= 1500);
      const soy    = foods.filter((f) => f.allergens.includes("soy")).length;
      let fishMeals = 0;
      for (const d of p.days) for (const m of d.meals) {
        if (m.items.some((i) => {
          const f = byId.get(i.foodId);
          return f && (f.tags.includes("fish") || f.tags.includes("seafood"));
        })) fishMeals++;
      }
      const potDays = dailyMicro(p, "potassium").map((v) => v / RDA.potassium);
      const potOk   = potDays.every((v) => v >= 0.8);
      return [
        { label: "Sodium ≤ 1500 mg/day",    pass: sodOk, detail: `max ${Math.max(...sodium).toFixed(0)} mg` },
        { label: "Zero soy",                pass: soy === 0, detail: `${soy} items` },
        { label: "≥ 3 fish meals/week",     pass: fishMeals >= 3, detail: `${fishMeals} fish meals` },
        { label: "Potassium ≥ 80% RDA",     pass: potOk, detail: `min ${(Math.min(...potDays)*100).toFixed(0)}% RDA` },
      ];
    },
  },
];

type Result = { persona: Persona; plan: MealPlan; checks: ReturnType<Persona["check"]> };

function PersonasPage() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [running, setRunning] = useState(false);
  const [totalMs, setTotalMs] = useState(0);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const t0 = performance.now();
      const out: Result[] = PERSONAS.map((persona) => {
        const targets = targetsFromKcal(persona.kcal, persona.conditions);
        const plan = generateMealPlan(targets, {
          diet: persona.diet,
          allergens: persona.allergens,
          conditions: persona.conditions,
          excludeTags: persona.excludeTags,
        }, 42 + persona.id.charCodeAt(0));
        return { persona, plan, checks: persona.check(plan) };
      });
      setTotalMs(Math.round(performance.now() - t0));
      setResults(out);
      setRunning(false);
    }, 0);
  };

  const passSummary = useMemo(() => {
    if (!results) return null;
    let pass = 0, total = 0;
    for (const r of results) for (const c of r.checks) { total++; if (c.pass) pass++; }
    return { pass, total };
  }, [results]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
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
            <h1 className="font-display text-3xl font-bold">Persona test bench</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Runs the BAX-423 personas through NutriAI's pipeline and scores each
              generated 7-day plan against the assignment's pass criteria.
            </p>
          </div>
          <Button size="lg" onClick={run} disabled={running}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {running ? "Running…" : results ? "Re-run tests" : "Run all personas"}
          </Button>
        </div>

        {results && passSummary && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Pill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={`${passSummary.pass}/${passSummary.total} criteria pass`} tone={passSummary.pass === passSummary.total ? "good" : "warn"} />
            <Pill icon={<Clock className="h-3.5 w-3.5" />} label={`${totalMs} ms total (4 plans)`} />
          </div>
        )}

        <div className="grid gap-5">
          {(results ?? PERSONAS.map((p) => ({ persona: p, plan: null as MealPlan | null, checks: [] as { label: string; pass: boolean; detail: string }[] }))).map((r, idx) => (
            <PersonaCard key={r.persona.id} idx={idx} result={r} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PersonaCard({ idx, result }: { idx: number; result: { persona: Persona; plan: MealPlan | null; checks: { label: string; pass: boolean; detail: string }[] } }) {
  const { persona, plan, checks } = result;
  const allPass = checks.length > 0 && checks.every((c) => c.pass);
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <header className={`flex items-center justify-between border-b px-5 py-4 ${plan ? (allPass ? "bg-primary-soft/40" : "bg-destructive/5") : ""}`}>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Persona {idx + 1}</div>
          <h3 className="font-display text-lg font-semibold">{persona.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{persona.blurb}</p>
        </div>
        {plan && (
          <div className="text-right">
            <div className="font-display text-2xl font-bold tabular-nums">{plan.generationMs} ms</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{plan.poolSize.toLocaleString()} food pool</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">diversity {plan.diversityScore}</div>
          </div>
        )}
      </header>
      <div className="grid gap-0 md:grid-cols-2">
        <ul className="divide-y">
          {(checks.length ? checks : persona.criteria.map((c) => ({ label: c, pass: false, detail: "—" }))).map((c, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="flex items-center gap-2">
                {plan ? (
                  c.pass ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )}
                {c.label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{c.detail}</span>
            </li>
          ))}
        </ul>
        {plan && (
          <div className="space-y-1 border-t bg-muted/20 p-5 text-xs md:border-l md:border-t-0">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Daily averages</div>
            <Avg label="Calories" value={`${avg(plan.days.map((d) => d.totals.calories)).toFixed(0)} / ${persona.kcal} kcal`} />
            <Avg label="Protein"  value={`${avg(plan.days.map((d) => d.totals.protein)).toFixed(0)} g`} />
            <Avg label="Carbs"    value={`${avg(plan.days.map((d) => d.totals.carbs)).toFixed(0)} g`} />
            <Avg label="Fat"      value={`${avg(plan.days.map((d) => d.totals.fat)).toFixed(0)} g`} />
            <Avg label="Fibre"    value={`${avg(plan.days.map((d) => d.micros.fiber)).toFixed(0)} g`} />
            <Avg label="Sodium"   value={`${avg(plan.days.map((d) => d.micros.sodium)).toFixed(0)} mg`} />
            <Avg label="Iron"     value={`${avg(plan.days.map((d) => d.micros.iron)).toFixed(1)} mg (${(avg(plan.days.map((d) => d.micros.iron))/RDA.iron*100).toFixed(0)}% RDA)`} />
            <Avg label="B12"      value={`${avg(plan.days.map((d) => d.micros.b12)).toFixed(1)} µg (${(avg(plan.days.map((d) => d.micros.b12))/RDA.b12*100).toFixed(0)}% RDA)`} />
            <Avg label="Weekly cost" value={`$${plan.weeklyCost.toFixed(2)}`} highlight />
          </div>
        )}
      </div>
    </section>
  );
}

function avg(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1); }

function Avg({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1 ${highlight ? "bg-primary-soft text-primary" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function Pill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: "good" | "warn" }) {
  const cls = tone === "good"
    ? "border-primary/30 bg-primary-soft text-primary"
    : tone === "warn"
      ? "border-amber-400/40 bg-amber-50 text-amber-700"
      : "border-border bg-card text-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}
