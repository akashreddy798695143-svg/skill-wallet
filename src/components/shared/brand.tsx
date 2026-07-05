import { cn } from "@/lib/utils";

/** Voice-Based Connect brand logo — microphone + sound waves. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-9 w-9", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vbc-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="var(--chart-1)" />
          <stop offset="100%" stopColor="var(--chart-2)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#vbc-grad)" />
      <rect
        x="20"
        y="10"
        width="8"
        height="18"
        rx="4"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M14 22a10 10 0 0 0 20 0"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <line
        x1="24"
        y1="32"
        x2="24"
        y2="38"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M9 22c0-1 1-2 2-2M39 22c0-1-1-2-2-2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo className="h-8 w-8" />
      <span className="font-bold tracking-tight text-lg leading-none">
        Voice<span className="gradient-text">Connect</span>
      </span>
    </span>
  );
}
