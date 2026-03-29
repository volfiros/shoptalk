import { cn } from "@/lib/utils";

type PageFrameProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
};

export const PageFrame = ({
  title,
  description,
  children,
  className
}: PageFrameProps) => {
  return (
    <main className={cn("flex flex-1 flex-col gap-8", className)}>
      <header className="max-w-3xl border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </main>
  );
};
