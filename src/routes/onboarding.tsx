import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, ArrowRight, ArrowLeft } from "lucide-react";
import { useProfile } from "@/lib/storage";
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  calculateTargets,
  type ActivityLevel,
  type Goal,
  type Profile,
  type Sex,
} from "@/lib/nutrition";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — NourishPlan" },
      { name: "description", content: "Set up your personalized calorie and macro targets in under a minute." },
    ],
  }),
  component: Onboarding,
});

type FormState = {
  name: string;
  sex: Sex;
  age: string;
  heightCm: string;
  weightKg: string;
  activity: ActivityLevel;
  goal: Goal;
};

const initial: FormState = {
  name: "",
  sex: "male",
  age: "",
  heightCm: "",
  weightKg: "",
  activity: "moderate",
  goal: "maintain",
};

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canNext = (() => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return !!form.sex && parseInt(form.age) > 0;
    if (step === 2)
      return parseFloat(form.heightCm) > 0 && parseFloat(form.weightKg) > 0;
    return true;
  })();

  const submit = () => {
    const profile: Profile = {
      name: form.name.trim(),
      sex: form.sex,
      age: parseInt(form.age),
      heightCm: parseFloat(form.heightCm),
      weightKg: parseFloat(form.weightKg),
      activity: form.activity,
      goal: form.goal,
    };
    setProfile(profile);
    navigate({ to: "/dashboard" });
  };

  const preview =
    form.age && form.heightCm && form.weightKg
      ? calculateTargets({
          name: form.name,
          sex: form.sex,
          age: parseInt(form.age),
          heightCm: parseFloat(form.heightCm),
          weightKg: parseFloat(form.weightKg),
          activity: form.activity,
          goal: form.goal,
        })
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-10">
        <div className="mb-10 flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">NourishPlan</span>
        </div>

        <div className="mb-8 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold">Welcome.</h1>
                <p className="mt-2 text-muted-foreground">
                  Let's build a plan tailored to your body and goals.
                </p>
              </div>
              <div>
                <Label htmlFor="name">What should we call you?</Label>
                <Input
                  id="name"
                  className="mt-2"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h1 className="font-display text-3xl font-bold">A bit about you</h1>
              <div>
                <Label>Sex</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["male", "female"] as Sex[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => update("sex", s)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                        form.sex === s
                          ? "border-primary bg-primary-soft text-primary"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  className="mt-2"
                  type="number"
                  min="10"
                  max="100"
                  placeholder="e.g. 28"
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="font-display text-3xl font-bold">Your measurements</h1>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    className="mt-2"
                    type="number"
                    placeholder="175"
                    value={form.heightCm}
                    onChange={(e) => update("heightCm", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    className="mt-2"
                    type="number"
                    placeholder="70"
                    value={form.weightKg}
                    onChange={(e) => update("weightKg", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="font-display text-3xl font-bold">Lifestyle &amp; goal</h1>
              <div>
                <Label>Activity level</Label>
                <div className="mt-2 space-y-2">
                  {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => update("activity", a)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        form.activity === a
                          ? "border-primary bg-primary-soft text-primary font-medium"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {ACTIVITY_LABEL[a]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Goal</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => update("goal", g)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                        form.goal === g
                          ? "border-primary bg-primary-soft text-primary"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {GOAL_LABEL[g]}
                    </button>
                  ))}
                </div>
              </div>
              {preview && (
                <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Your daily plan
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-primary">
                    {preview.calories} kcal
                  </p>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>Protein <b className="text-foreground">{preview.protein}g</b></span>
                    <span>Carbs <b className="text-foreground">{preview.carbs}g</b></span>
                    <span>Fat <b className="text-foreground">{preview.fat}g</b></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit}>Start tracking</Button>
          )}
        </div>
      </div>
    </div>
  );
}
