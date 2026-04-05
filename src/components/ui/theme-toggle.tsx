"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme, isReady } = useTheme();

  if (!isReady) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background",
          className
        )}
      >
        <div className="h-5 w-5 animate-skeleton rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "group relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background transition-all hover:border-primary/40 hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95",
        className
      )}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <div className="relative h-5 w-5">
        <Sun
          className={cn(
            "absolute inset-0 h-5 w-5 text-amber-500 transition-all duration-300",
            theme === "dark"
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-5 w-5 text-amber-400 transition-all duration-300",
            theme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300",
          theme === "dark"
            ? "bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100"
            : "bg-gradient-to-tr from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100"
        )}
      />
    </button>
  );
};
