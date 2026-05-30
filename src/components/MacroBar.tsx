type Props = {
  label: string;
  value: number;
  target: number;
  colorVar: string; // e.g. "var(--color-protein)"
  unit?: string;
};

export function MacroBar({ label, value, target, colorVar, unit = "g" }: Props) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.round(value)} / {target}{unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: colorVar }}
        />
      </div>
    </div>
  );
}
