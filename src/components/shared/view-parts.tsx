"use client";

import { cn } from "@/lib/utils";

export function ViewHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl brand-gradient text-white shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
