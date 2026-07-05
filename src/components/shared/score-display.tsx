import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/types";

const RATING_STYLES: Record<Rating, string> = {
  Excellent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Good: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  Average: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "Needs Improvement": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

export function ScoreBadge({
  rating,
  className,
}: {
  rating: Rating;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        RATING_STYLES[rating],
        className
      )}
    >
      {rating}
    </span>
  );
}

export function ScoreRing({
  value,
  size = 120,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          stroke="url(#ring-grad)"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(pct)}</span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

export function StatBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full brand-gradient rounded-full"
          style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
        />
      </div>
    </div>
  );
}
