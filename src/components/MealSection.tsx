import { Trash2 } from "lucide-react";
import { AddFoodDialog } from "./AddFoodDialog";
import { sumMacros, type LoggedItem, type MealType } from "@/lib/storage";

type Props = {
  meal: MealType;
  title: string;
  icon: string;
  items: LoggedItem[];
  onAdd: (meal: MealType, item: LoggedItem) => void;
  onRemove: (meal: MealType, id: string) => void;
};

export function MealSection({ meal, title, icon, items, onAdd, onRemove }: Props) {
  const totals = sumMacros(items);
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-lg">
            {icon}
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {Math.round(totals.calories)} kcal · P{Math.round(totals.protein)} · C{Math.round(totals.carbs)} · F{Math.round(totals.fat)}
            </p>
          </div>
        </div>
        <AddFoodDialog meal={meal} onAdd={onAdd} />
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          No items logged yet.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.amount}{item.unit === "piece" ? " pc" : item.unit} · {Math.round(item.calories)} kcal
                </div>
              </div>
              <button
                onClick={() => onRemove(meal, item.id)}
                className="ml-3 rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
