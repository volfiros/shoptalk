"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLiveSession } from "@/hooks/use-live-session";
import { useSessionValue } from "@/hooks/use-session-value";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  getGeminiClientErrorMessage,
  getGeminiValidationErrorMessage,
  validateGeminiApiKey
} from "@/lib/session";

type ChatScreenProps = {
  orderCount: number;
};

const EMPTY_PROMPTS = [
  "Where is my order?",
  "Can I return the headphones from my last purchase?",
  "What is the refund policy?"
] as const;

export const ChatScreen = ({ orderCount }: ChatScreenProps) => {
  const router = useRouter();
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const { ready, value, setValue } = useSessionValue(GEMINI_API_KEY_STORAGE_KEY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const {
    endConversation,
    errorMessage,
    isLoadingMicrophones,
    messages,
    microphoneDevices,
    retryConnection,
    selectedMicrophoneId,
    sessionInfo,
    startListening,
    stopListening,
    updateSelectedMicrophoneId,
    voiceState
  } = useLiveSession({ apiKey: value });

  const openSettings = useCallback(() => {
    setDraftApiKey(value ?? "");
    setSettingsError(null);
    setIsSettingsOpen(true);
  }, [value]);

  const closeSettings = useCallback(() => {
    if (isSavingKey) {
      return;
    }

    setIsSettingsOpen(false);
    setSettingsError(null);
    setDraftApiKey(value ?? "");
  }, [isSavingKey, value]);

  const microphoneSelectionDisabled =
    voiceState === "connecting" ||
    voiceState === "listening" ||
    voiceState === "assistant-responding";
  const statusCopy =
    voiceState === "connecting"
      ? "Connecting the live session."
      : voiceState === "listening"
        ? "Listening now. Stop when you finish speaking."
        : voiceState === "assistant-responding"
          ? "Assistant is responding. The mic stays disabled until the turn completes."
          : voiceState === "error"
            ? "The session needs attention before recording can continue."
            : "Ready for another turn.";

  useEffect(() => {
    if (ready && !value) {
      router.replace("/");
    }
  }, [ready, router, value]);

  useEffect(() => {
    const transcriptViewport = transcriptViewportRef.current;

    if (!transcriptViewport) {
      return;
    }

    transcriptViewport.scrollTo({
      top: transcriptViewport.scrollHeight
    });
  }, [messages]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsPanelRef.current?.contains(event.target as Node)) {
        closeSettings();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSettings, isSettingsOpen]);

  const saveApiKey = async () => {
    const nextKey = draftApiKey.trim();

    const nextError = validateGeminiApiKey(
      nextKey,
      "Enter a Gemini API key to save it."
    );

    if (nextError) {
      setSettingsError(nextError);
      return;
    }

    setIsSavingKey(true);
    setSettingsError(null);

    try {
      const response = await fetch("/api/live/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey: nextKey })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(getGeminiValidationErrorMessage(payload.error));
      }

      setValue(nextKey);
      setIsSettingsOpen(false);
    } catch (saveError) {
      setSettingsError(
        getGeminiClientErrorMessage(saveError)
      );
    } finally {
      setIsSavingKey(false);
    }
  };

  if (!ready || !value) {
    return (
      <AppShell contentClassName="max-w-[90rem]">
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
    <AppShell
      className="h-[100dvh] overflow-hidden"
      contentClassName="h-full min-h-0 max-w-[92rem] px-4 py-3 sm:px-6 lg:px-8"
    >
      <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="z-20 flex justify-center">
          <div
            ref={settingsPanelRef}
            className="relative w-full max-w-3xl rounded-lg border border-border bg-surface/95 px-4 py-3 shadow-[0_6px_20px_rgba(54,46,31,0.08)] backdrop-blur-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div
                  aria-live="polite"
                  className="text-sm text-foreground"
                >
                  <span className="font-medium capitalize">{voiceState}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {sessionInfo.model} · {sessionInfo.voice}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {sessionInfo.sessionId
                    ? `Session ${sessionInfo.sessionId}`
                    : `${orderCount} orders available`}
                </div>
              </div>
              <div className="flex items-start justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Open chat settings"
                  title="Settings"
                  onClick={isSettingsOpen ? closeSettings : openSettings}
                >
                  <Settings2 />
                </Button>
              </div>
            </div>
            {errorMessage ? (
              <div className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>{errorMessage}</p>
                <Button variant="outline" onClick={retryConnection}>
                  Retry connection
                </Button>
              </div>
            ) : null}
            {isSettingsOpen ? (
              <div className="absolute right-4 top-[calc(100%+0.75rem)] z-30 w-[min(26rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-4 shadow-[0_14px_40px_rgba(54,46,31,0.12)]">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">
                      Gemini API key
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Update the key for this browser session and reconnect the chat with the new value.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="chat-settings-api-key">Gemini API key</Label>
                    <Input
                      id="chat-settings-api-key"
                      type="password"
                      value={draftApiKey}
                      onChange={(event) => {
                        setDraftApiKey(event.target.value);
                        setSettingsError(null);
                      }}
                      autoComplete="off"
                      placeholder="Paste your Gemini API key"
                      disabled={isSavingKey}
                    />
                  </div>
                  {settingsError ? (
                    <p className="text-sm text-destructive">{settingsError}</p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeSettings}
                      disabled={isSavingKey}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        void saveApiKey();
                      }}
                      disabled={isSavingKey}
                    >
                      {isSavingKey ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <section className="relative flex min-h-0 flex-1 justify-center overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
            <div className="h-0.5 w-full max-w-[84rem] bg-linear-to-b from-background/85 to-transparent" />
          </div>
          <div className="flex w-full max-w-[84rem] flex-1 flex-col">
            <div
              ref={transcriptViewportRef}
              className="h-full overflow-y-auto px-2 py-2 sm:px-4"
            >
              {messages.length > 0 ? (
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex w-full ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <article
                        className={`max-w-[min(42rem,82%)] rounded-2xl border px-5 py-4 shadow-[0_4px_14px_rgba(54,46,31,0.05)] ${
                          message.role === "user"
                            ? "border-primary/25 bg-primary text-primary-foreground"
                            : "border-border bg-surface text-foreground"
                        }`}
                      >
                        <p
                          className={`text-[15px] leading-7 whitespace-pre-wrap ${
                            message.role === "user"
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {message.body}
                        </p>
                      </article>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[28rem] items-center justify-center">
                  <div className="w-full max-w-md rounded-2xl border border-border bg-surface px-6 py-6 text-center shadow-[0_8px_24px_rgba(54,46,31,0.06)]">
                    <p className="text-base font-medium text-foreground">Try a prompt</p>
                    <div className="mt-4 flex flex-col gap-2 text-left">
                      {EMPTY_PROMPTS.map((prompt) => (
                        <div
                          key={prompt}
                          className="rounded-lg border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          {prompt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="z-20 flex justify-center px-2 pb-2 sm:px-4 sm:pb-3">
          <section className="w-full max-w-4xl rounded-2xl border border-border bg-surface px-4 py-4 shadow-[0_10px_28px_rgba(54,46,31,0.08)]">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="microphone-device">Microphone</Label>
                  <select
                    id="microphone-device"
                    value={selectedMicrophoneId}
                    onChange={(event) => {
                      updateSelectedMicrophoneId(event.target.value);
                    }}
                    disabled={
                      microphoneSelectionDisabled ||
                      isLoadingMicrophones ||
                      microphoneDevices.length === 0
                    }
                    className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {microphoneDevices.length === 0 ? (
                      <option value="">
                        {isLoadingMicrophones
                          ? "Loading microphones..."
                          : "No microphone found"}
                      </option>
                    ) : (
                      microphoneDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                  {statusCopy}
                </div>
              </div>
              {voiceState === "listening" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={stopListening}>Stop recording</Button>
                  <Button variant="outline" onClick={endConversation}>
                    End chat
                  </Button>
                </div>
              ) : voiceState === "assistant-responding" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button disabled>Assistant responding...</Button>
                  <Button variant="outline" onClick={endConversation}>
                    End chat
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={startListening}
                    disabled={voiceState !== "idle"}
                  >
                    {voiceState === "connecting" ? "Connecting..." : "Start chat"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={endConversation}
                    disabled={messages.length === 0}
                  >
                    End chat
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
};
