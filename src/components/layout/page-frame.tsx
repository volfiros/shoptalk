import { cn } from "@/lib/utils";

type PageFrameProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export const PageFrame = ({
  title,
  description,
  children,
  className,
  headerClassName
}: PageFrameProps) => {
  return (
    <main className={cn("flex flex-1 flex-col gap-8 sm:gap-10", className)}>
      <header
        className={cn(
          "max-w-3xl pb-2 animate-fade-in-up",
          headerClassName
        )}
      >
        <div className="flex flex-col gap-3">
          <h1 className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>
      </header>
      <div className="animate-fade-in-up stagger-2">
        {children}
      </div>
    </main>
  );
};
