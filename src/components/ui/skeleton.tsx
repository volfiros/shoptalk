import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-lg bg-muted",
        className
      )}
    />
  );
};

type SkeletonTextProps = {
  className?: string;
  lines?: number;
};

export const SkeletonText = ({ className, lines = 1 }: SkeletonTextProps) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            index === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
};

type SkeletonCircleProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export const SkeletonCircle = ({ className, size = "md" }: SkeletonCircleProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  return (
    <Skeleton
      className={cn(
        "rounded-full",
        sizeClasses[size],
        className
      )}
    />
  );
};

type SkeletonPanelProps = {
  className?: string;
};

export const SkeletonPanel = ({ className }: SkeletonPanelProps) => {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-2xl border border-border/60 bg-surface/80 p-8",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex flex-col gap-4 pt-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
};

type SkeletonMessageProps = {
  className?: string;
  align?: "left" | "right";
};

export const SkeletonMessage = ({ className, align = "left" }: SkeletonMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full",
        align === "right" ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "animate-skeleton flex max-w-[min(24rem,75%)] flex-col gap-2 rounded-2xl border border-border/60 bg-surface px-6 py-4",
          align === "right" ? "rounded-br-sm" : "rounded-bl-sm"
        )}
      >
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
};
