import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export const AppShell = ({ children, className }: AppShellProps) => {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        {children}
      </div>
    </div>
  );
};
