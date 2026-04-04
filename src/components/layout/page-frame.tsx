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
    <main className={cn("flex flex-1 flex-col gap-10", className)}>
      <header className={cn("max-w-3xl pb-2", headerClassName)}>
        <div className="flex flex-col gap-3">
          <h1 className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            {title}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </main>
  );
};
