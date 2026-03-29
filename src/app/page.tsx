import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";

const HomePage = () => {
  return (
    <AppShell>
      <PageFrame
        title="Voice support assistant"
        description="Stage 1 establishes the project shell, visual system, and shared layout primitives before the setup flow, support data, and Gemini voice work are added in later stages."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfacePanel
            title="Foundation scope"
            description="This pass keeps the interface intentionally plain. The goal is to lock the layout system and design tokens before the product behavior arrives."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-muted-foreground">
              <li>Generated Next.js app using create-next-app</li>
              <li>Tailwind v4 token layer and shared app shell</li>
              <li>shadcn/ui initialized for component usage</li>
              <li>Agent instruction files ignored from git</li>
            </ul>
          </SurfacePanel>
          <SurfacePanel
            title="Guardrails"
            description="The visual direction stays normal and restrained so the product can grow without drifting into a generic AI landing page."
          >
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-border bg-muted/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
                No oversized hero, no glossy dashboard chrome, and no decorative metric cards.
              </div>
              <Button className="w-fit" disabled>
                Stage 2 adds setup flow
              </Button>
            </div>
          </SurfacePanel>
        </div>
      </PageFrame>
    </AppShell>
  );
};

export default HomePage;
