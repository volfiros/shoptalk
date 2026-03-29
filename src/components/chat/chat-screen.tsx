"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSessionValue } from "@/hooks/use-session-value";
import { GEMINI_API_KEY_STORAGE_KEY } from "@/lib/session";

type ChatScreenProps = {
  orderCount: number;
};

const demoMessages = [
  {
    id: "system",
    role: "assistant",
    title: "Support session ready",
    body: "Your support workspace is ready. The conversation view, status areas, and voice dock are all in place."
  },
  {
    id: "hint",
    role: "user",
    title: "Example prompts",
    body: "Where is my order? I want to return a product. What is the refund policy?"
  }
] as const;

export const ChatScreen = ({ orderCount }: ChatScreenProps) => {
  const router = useRouter();
  const { ready, value } = useSessionValue(GEMINI_API_KEY_STORAGE_KEY);

  useEffect(() => {
    if (ready && !value) {
      router.replace("/");
    }
  }, [ready, router, value]);

  if (!ready || !value) {
    return (
      <AppShell>
      <PageFrame
        title="Loading chat"
        description="Checking the browser session before the chat view loads."
      >
        <SurfacePanel
          title="Preparing session"
            description="If no Gemini key is available in this browser session, the app will return to the setup screen."
          >
            <p className="text-sm leading-6 text-muted-foreground">
              Verifying session state...
            </p>
          </SurfacePanel>
        </PageFrame>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageFrame
        title="Support chat"
        description="Voice-first help for orders, returns, and policy questions."
      >
        <div className="flex flex-1 flex-col gap-4">
          <SurfacePanel
            title="Current session"
            description={`The fixed demo user currently has ${orderCount} orders available to the support layer.`}
          >
            <div
              aria-live="polite"
              className="rounded-md border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground"
            >
              Status: idle. The voice dock is in place, and the chat is ready for the live connection.
            </div>
          </SurfacePanel>

          <SurfacePanel title="Conversation" description="The transcript timeline stays central to the interface so spoken input and assistant output remain easy to review.">
            <div className="flex flex-col gap-4">
              {demoMessages.map((message, index) => (
                <div key={message.id} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{message.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{message.body}</p>
                  </div>
                  {index < demoMessages.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel
            title="Voice dock"
            description="The visible UI stays voice-only. Typed fallback input is not part of this product surface."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">Mic state</p>
                <p className="text-sm text-muted-foreground">
                  Idle for now. The microphone control will attach to the live session here.
                </p>
              </div>
              <Button disabled>Mic unavailable</Button>
            </div>
          </SurfacePanel>
        </div>
      </PageFrame>
    </AppShell>
  );
};
