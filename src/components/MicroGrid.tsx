import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  NUTRIENT_META,
  TRACKED_KEYS,
  type NutrientTotals,
  type RdaTargets,
  type TrackedKey,
} from "@/lib/micros";

type Props = {
  values: Pick<NutrientTotals, TrackedKey>;
  rda: RdaTargets;
  /** When 'meal', RDA is pro-rated by `share` (default 1 = whole day). */
  share?: number;
  compact?: boolean;
  title?: string;
};

export function MicroGrid({ values, rda, share = 1, compact = false, title }: Props) {
  const gaps: TrackedKey[] = [];
  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold">{title}</h4>
        </div>
      )}
      <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"}`}>
        {TRACKED_KEYS.map((k) => {
          const target = rda[k] * share;
          const value = values[k];
          const pct = target > 0 ? value / target : 0;
          const low = pct < 0.8;
          if (low) gaps.push(k);
          const m = NUTRIENT_META[k];
          return (
            <div
              key={k}
              className={`rounded-xl border px-3 py-2 text-left ${
                low ? "border-destructive/40 bg-destructive/5" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{m.label}</span>
                {low ? (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                ) : (
                  <ShieldCheck className="h-3 w-3 text-primary" />
                )}
              </div>
              <div className={`mt-0.5 font-display text-sm font-bold tabular-nums ${low ? "text-destructive" : ""}`}>
                {value.toFixed(m.decimals)}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{m.unit}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {Math.round(pct * 100)}% of {target.toFixed(m.decimals)}{m.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
