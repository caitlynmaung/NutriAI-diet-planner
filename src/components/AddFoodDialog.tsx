import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { FOODS, type FoodItem } from "@/lib/foods";
import type { LoggedItem, MealType } from "@/lib/storage";

type Props = {
  meal: MealType;
  onAdd: (meal: MealType, item: LoggedItem) => void;
};

export function AddFoodDialog({ meal, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 10);
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  const reset = () => {
    setSelected(null);
    setAmount("");
    setQuery("");
  };

  const handleAdd = () => {
    if (!selected) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const ratio = amt / selected.baseAmount;
    const item: LoggedItem = {
      id: crypto.randomUUID(),
      foodId: selected.id,
      name: selected.name,
      unit: selected.unit,
      amount: amt,
      calories: selected.calories * ratio,
      protein: selected.protein * ratio,
      carbs: selected.carbs * ratio,
      fat: selected.fat * ratio,
    };
    onAdd(meal, item);
    setOpen(false);
    reset();
  };

  const defaultAmount = (f: FoodItem) => (f.unit === "piece" ? "1" : "100");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary-soft hover:text-primary">
          <Plus className="mr-1 h-4 w-4" /> Add food
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">Add to {meal}</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search foods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelected(f);
                    setAmount(defaultAmount(f));
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-primary-soft"
                >
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.calories} kcal / {f.baseAmount}{f.unit === "piece" ? " pc" : f.unit}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                Per {selected.baseAmount}
                {selected.unit === "piece" ? " piece" : selected.unit}: {selected.calories} kcal · P{selected.protein}g · C{selected.carbs}g · F{selected.fat}g
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Serving size ({selected.unit === "piece" ? "pieces" : selected.unit})
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="rounded-lg bg-primary-soft p-3 text-sm">
                <div className="font-semibold">
                  {Math.round((selected.calories * parseFloat(amount)) / selected.baseAmount)} kcal
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  P {Math.round((selected.protein * parseFloat(amount)) / selected.baseAmount)}g ·
                  {" "}C {Math.round((selected.carbs * parseFloat(amount)) / selected.baseAmount)}g ·
                  {" "}F {Math.round((selected.fat * parseFloat(amount)) / selected.baseAmount)}g
                </div>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Back
              </Button>
              <Button onClick={handleAdd} disabled={!amount || parseFloat(amount) <= 0}>
                Add
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
