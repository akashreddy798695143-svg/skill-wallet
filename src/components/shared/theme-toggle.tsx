"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAppStore();

  // Sync from localStorage on mount (the inline script already applied the class).
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vbc-theme") as "light" | "dark" | null;
      if (stored && stored !== theme) setTheme(stored);
      else if (!stored && typeof window !== "undefined") {
        const dark = document.documentElement.classList.contains("dark");
        setTheme(dark ? "dark" : "light");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={className}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
