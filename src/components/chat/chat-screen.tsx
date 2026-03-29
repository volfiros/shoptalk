"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLiveSession } from "@/hooks/use-live-session";
import { useSessionValue } from "@/hooks/use-session-value";
import { GEMINI_API_KEY_STORAGE_KEY } from "@/lib/session";

type ChatScreenProps = {
  orderCount: number;
};

export const ChatScreen = ({ orderCount }: ChatScreenProps) => {
  const router = useRouter();
  const { ready, value } = useSessionValue(GEMINI_API_KEY_STORAGE_KEY);
  const {
    errorMessage,
    messages,
    retryConnection,
    sessionInfo,
    startListening,
    stopListening,
    voiceState
  } = useLiveSession({ apiKey: value });

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
            description={`The current support data includes ${orderCount} orders. Live voice now handles key validation, session setup, microphone capture, and input transcription.`}
          >
            <div
              aria-live="polite"
              className="rounded-md border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground"
            >
              Status: {voiceState}. Model: {sessionInfo.model}. Voice: {sessionInfo.voice}.
            </div>
            {sessionInfo.sessionId ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Session ID: {sessionInfo.sessionId}
              </p>
            ) : null}
            {errorMessage ? (
              <div className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                <p>{errorMessage}</p>
                <div>
                  <Button variant="outline" onClick={retryConnection}>
                    Retry connection
                  </Button>
                </div>
              </div>
            ) : null}
          </SurfacePanel>

          <SurfacePanel title="Conversation" description="The transcript timeline stays central to the interface so spoken input and assistant output remain easy to review.">
            {messages.length > 0 ? (
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                  <div key={message.id} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {message.title}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {message.body}
                      </p>
                    </div>
                    {index < messages.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-4 py-3">
                    <p className="text-sm font-medium text-foreground">Try a prompt</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Where is my order? I want to return a product. What is the refund policy?
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SurfacePanel>

          <SurfacePanel
            title="Voice dock"
            description="The visible UI stays voice-only. Typed fallback input is not part of this product surface."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">Mic state</p>
                <p className="text-sm text-muted-foreground">
                  {voiceState === "connecting"
                    ? "Connecting the live session."
                    : voiceState === "listening"
                      ? "Listening now. Stop when you finish speaking."
                      : voiceState === "assistant-responding"
                        ? "Assistant is responding. The mic stays disabled until the turn completes."
                        : voiceState === "error"
                          ? "The session needs attention before recording can continue."
                          : "Ready to listen."}
                </p>
              </div>
              {voiceState === "listening" ? (
                <Button onClick={stopListening}>Stop recording</Button>
              ) : (
                <Button
                  onClick={startListening}
                  disabled={voiceState !== "idle"}
                >
                  {voiceState === "connecting" ? "Connecting..." : "Start listening"}
                </Button>
              )}
            </div>
          </SurfacePanel>
        </div>
      </PageFrame>
    </AppShell>
  );
};
