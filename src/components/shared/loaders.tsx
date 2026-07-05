import { Logo } from "@/components/shared/brand";
import { cn } from "@/lib/utils";

/** Full-screen branded loader shown during initial auth hydration. */
export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 mesh-bg">
      <div className="relative">
        <Logo className="h-16 w-16 animate-float" />
        <span className="absolute inset-0 rounded-2xl brand-gradient opacity-30 blur-xl animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 text-primary h-6">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            className="wave-bar h-6"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading Voice-Based Connect…
      </p>
    </div>
  );
}

/** Inline spinner for buttons / small areas. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin",
        className
      )}
      aria-hidden="true"
    />
  );
}

/** Card skeleton grid. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-6 h-32 shimmer"
        />
      ))}
    </div>
  );
}
