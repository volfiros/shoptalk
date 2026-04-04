import { cn } from "@/lib/utils";

type SurfacePanelProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export const SurfacePanel = ({
  title,
  description,
  children,
  className
}: SurfacePanelProps) => {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-surface/80 p-8 text-surface-foreground shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all",
        className
      )}
    >
      <div className="flex flex-col gap-2 pb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="pt-2">{children}</div>
    </section>
  );
};
