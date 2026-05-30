type Props = {
  consumed: number;
  target: number;
  size?: number;
  stroke?: number;
};

export function ProgressRing({ consumed, target, size = 240, stroke = 18 }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circumference * (1 - pct);
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={over ? "var(--color-destructive)" : "var(--color-primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-5xl font-bold tracking-tight">
          {Math.round(remaining)}
        </span>
        <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          {over ? "over" : "kcal left"}
        </span>
        <span className="mt-2 text-xs text-muted-foreground">
          {Math.round(consumed)} / {target} kcal
        </span>
      </div>
    </div>
  );
}
