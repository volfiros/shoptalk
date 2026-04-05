import { cn } from "@/lib/utils";

type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "assistant-responding"
  | "error";

type VoiceIndicatorProps = {
  state: VoiceState;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export const VoiceIndicator = ({
  state,
  className,
  size = "md"
}: VoiceIndicatorProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  const ringOffsets = {
    sm: "h-5 w-5 -top-1 -left-1",
    md: "h-6 w-6 -top-1 -left-1",
    lg: "h-8 w-8 -top-1.5 -left-1.5"
  };

  const stateColors = {
    idle: "bg-muted-foreground",
    connecting: "bg-amber-500",
    listening: "bg-green-500",
    "assistant-responding": "bg-primary",
    error: "bg-destructive"
  };

  const ringColors = {
    idle: "border-muted-foreground/30",
    connecting: "border-amber-500/40",
    listening: "border-green-500/40",
    "assistant-responding": "border-primary/40",
    error: "border-destructive/40"
  };

  const isAnimating = state === "connecting" || state === "listening" || state === "assistant-responding";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      role="status"
      aria-label={`Voice state: ${state.replace("-", " ")}`}
    >
      <span
        className={cn(
          "rounded-full transition-colors duration-300",
          sizeClasses[size],
          stateColors[state]
        )}
      />
      {isAnimating && (
        <>
          <span
            className={cn(
              "absolute rounded-full border-2 opacity-75",
              ringOffsets[size],
              ringColors[state],
              state === "connecting" && "animate-pulse-glow",
              state === "listening" && "animate-breathing",
              state === "assistant-responding" && "animate-ripple"
            )}
          />
          {state === "assistant-responding" && (
            <span
              className={cn(
                "absolute rounded-full border-2 opacity-50",
                ringOffsets[size],
                ringColors[state],
                "animate-ripple"
              )}
              style={{ animationDelay: "0.4s" }}
            />
          )}
        </>
      )}
    </span>
  );
};
