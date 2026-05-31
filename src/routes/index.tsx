import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Leaf, Activity, Target, Utensils } from "lucide-react";
import { useProfile } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriAI — Personalized Diet Planner" },
      { name: "description", content: "Get a personalized daily calorie and macro plan, log meals, and track progress in real time." },
      { property: "og:title", content: "NutriAI — Personalized Diet Planner" },
      { property: "og:description", content: "Personalized calorie targets, macro tracking, and meal logging — built for healthy habits." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { profile, loaded } = useProfile();

  useEffect(() => {
    if (loaded && profile) navigate({ to: "/dashboard" });
  }, [loaded, profile, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">NutriAI</span>
        </Link>
        <Button asChild variant="ghost">
          <Link to="/onboarding">Get started</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for healthy habits
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight md:text-6xl">
            Eat with intention.{" "}
            <span className="text-primary">Hit your goals.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Personalized calorie and macro targets, real-time meal tracking, and a
            dashboard that actually keeps you on plan.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="px-7">
              <Link to="/onboarding">Build my plan</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "1,000+ USDA foods",
              body: "Search and log from a curated USDA FoodData Central database, tagged with allergens and diet flags.",
            },
            {
              icon: Utensils,
              title: "7-day meal plan in seconds",
              body: "Personalized weekly plan that respects allergens, diet, and clinical conditions like diabetes, CKD, or hypertension.",
            },
            {
              icon: Activity,
              title: "Real-time progress",
              body: "A clean dashboard ring keeps your remaining calories and macros front and center.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
