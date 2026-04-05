"use client";

import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export const AppShell = ({
  children,
  className,
  contentClassName
}: AppShellProps) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-background transition-colors duration-300 animate-fade-in",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-10",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};
