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
        "group rounded-2xl border border-border/60 bg-surface/90 p-6 text-surface-foreground shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-border/80 hover:shadow-xl sm:p-8 dark:shadow-black/20 dark:hover:shadow-black/30 dark:hover:border-primary/20",
        className
      )}
    >
      <div className="flex flex-col gap-2 pb-5 sm:pb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="pt-2">{children}</div>
    </section>
  );
};
