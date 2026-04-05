import { cn } from "@/lib/utils";

type LoadingDotsProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export const LoadingDots = ({ className, size = "md" }: LoadingDotsProps) => {
  const sizeClasses = {
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
    lg: "h-2 w-2"
  };

  const gapClasses = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center",
        gapClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span
        className={cn(
          "animate-bounce-dot-1 rounded-full bg-current",
          sizeClasses[size]
        )}
      />
      <span
        className={cn(
          "animate-bounce-dot-2 rounded-full bg-current",
          sizeClasses[size]
        )}
      />
      <span
        className={cn(
          "animate-bounce-dot-3 rounded-full bg-current",
          sizeClasses[size]
        )}
      />
    </span>
  );
};
