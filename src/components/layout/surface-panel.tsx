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
        "rounded-lg border border-border bg-surface p-5 text-surface-foreground shadow-[0_4px_14px_rgba(54,46,31,0.06)]",
        className
      )}
    >
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
};
