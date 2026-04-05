"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingDots } from "@/components/ui/loading-dots";
import { SkeletonPanel, SkeletonMessage } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VoiceIndicator } from "@/components/ui/voice-indicator";
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

type EmptyPromptButtonProps = {
  prompt: string;
  disabled: boolean;
  onSelect: (prompt: string) => void;
};

const EmptyPromptButton = ({
  prompt,
  disabled,
  onSelect
}: EmptyPromptButtonProps) => {
  return (
    <button
      type="button"
      className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:border-primary/30 hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      disabled={disabled}
      onClick={() => onSelect(prompt)}
    >
      {prompt}
    </button>
  );
};

export const ChatScreen = ({ orderCount }: ChatScreenProps) => {
  const router = useRouter();
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const animatedMessageIdsRef = useRef<Set<string>>(new Set());
  const { ready, value, setValue } = useSessionValue(GEMINI_API_KEY_STORAGE_KEY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const {
    endConversation,
    errorMessage,
    isChatActive,
    isLoadingMicrophones,
    messages,
    microphoneDevices,
    retryConnection,
    selectedMicrophoneId,
    sendTextPrompt,
    sessionInfo,
    startListening,
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

  const handleEmptyPromptSelect = useCallback((prompt: string) => {
    sendTextPrompt(prompt, {
      startListeningAfterAssistantReply: true
    });
  }, [sendTextPrompt]);

  const getMessageAnimationClassName = (messageId: string, role: "user" | "assistant") => {
    if (animatedMessageIdsRef.current.has(messageId)) {
      return "";
    }

    animatedMessageIdsRef.current.add(messageId);
    return role === "user" ? "animate-slide-in-left" : "animate-slide-in-right";
  };


  const microphoneSelectionDisabled =
    isChatActive ||
    voiceState === "connecting" ||
    voiceState === "listening" ||
    voiceState === "assistant-responding";

  const getStatusCopy = () => {
    switch (voiceState) {
      case "connecting":
        return (
          <span className="flex items-center gap-2">
            Connecting
            <LoadingDots size="sm" />
          </span>
        );
      case "listening":
        return "Listening...";
      case "assistant-responding":
        return "Responding...";
      case "error":
        return "Error occurred";
      default:
        return isChatActive ? "Ready" : "Idle";
    }
  };

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
      top: transcriptViewport.scrollHeight,
      behavior: "smooth"
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
          <SkeletonPanel />
        </PageFrame>
      </AppShell>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header
        ref={settingsPanelRef}
        className="relative z-20 flex items-center justify-between border-b border-border/50 bg-surface/80 px-3 py-2 backdrop-blur-lg sm:px-4"
      >
        <div className="flex items-center gap-3">
          <VoiceIndicator state={voiceState} size="sm" />
          <div className="text-sm">
            <span className="font-medium capitalize text-foreground">{voiceState.replace("-", " ")}</span>
            <span className="ml-2 text-muted-foreground hidden sm:inline">
              {sessionInfo.model} · {sessionInfo.voice}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="h-8 w-8" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            aria-label="Open chat settings"
            title="Settings"
            onClick={isSettingsOpen ? closeSettings : openSettings}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        {isSettingsOpen ? (
          <div className="animate-slide-down absolute right-2 top-full z-30 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-xl border border-border/60 bg-surface p-4 shadow-xl backdrop-blur-xl dark:shadow-black/30">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Update API key</p>
              <Input
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
              {settingsError ? (
                <p className="text-xs text-destructive">{settingsError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={closeSettings} disabled={isSavingKey}>
                  Cancel
                </Button>
                <Button size="sm" loading={isSavingKey} onClick={() => void saveApiKey()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {errorMessage ? (
        <div className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          <p className="text-foreground">{errorMessage}</p>
          <Button variant="outline" size="xs" onClick={retryConnection}>
            Reset session
          </Button>
        </div>
      ) : null}

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={transcriptViewportRef}
          className="flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        >
          {voiceState === "connecting" && messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
              <SkeletonMessage align="right" />
              <SkeletonMessage align="left" />
            </div>
          ) : messages.length > 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-3 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex w-full ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } ${getMessageAnimationClassName(message.id, message.role)}`}
                >
                  <article
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/50 bg-surface text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    {message.role === "assistant" && message.wasInterrupted ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">Interrupted</p>
                    ) : null}
                  </article>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mic className="h-5 w-5" />
                </div>
                <p className="text-base font-medium text-foreground">Shop Talk</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Voice assistant for orders & support
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {EMPTY_PROMPTS.map((prompt) => (
                    <EmptyPromptButton
                      key={prompt}
                      prompt={prompt}
                      disabled={voiceState !== "idle"}
                      onSelect={handleEmptyPromptSelect}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="z-20 border-t border-border/50 bg-surface/80 px-3 py-3 backdrop-blur-lg sm:px-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <select
            id="microphone-device"
            value={selectedMicrophoneId}
            onChange={(event) => updateSelectedMicrophoneId(event.target.value)}
            disabled={microphoneSelectionDisabled || isLoadingMicrophones || microphoneDevices.length === 0}
            className="h-9 min-w-0 flex-1 appearance-none truncate rounded-lg border border-border/50 bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {microphoneDevices.length === 0 ? (
              <option value="">{isLoadingMicrophones ? "Loading..." : "No mic"}</option>
            ) : (
              microphoneDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
          <div className="hidden text-xs text-muted-foreground sm:block">{getStatusCopy()}</div>
          {isChatActive ? (
            <Button variant="outline" size="sm" onClick={endConversation}>
              End
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => {
                  void startListening();
                }}
                loading={voiceState === "connecting"}
                disabled={voiceState !== "idle"}
              >
                Start
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={endConversation}>
                  Clear
                </Button>
              )}
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
