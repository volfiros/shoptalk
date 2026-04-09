"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronDown, Mic, Mic2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { SkeletonMessage } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { VoiceIndicator } from "@/components/ui/voice-indicator";
import { useLiveSession } from "@/hooks/use-live-session";
import { useSessionValue } from "@/hooks/use-session-value";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  getGeminiClientErrorMessage,
  getGeminiValidationErrorMessage,
  validateGeminiApiKey
} from "@/lib/session";

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

export const ChatScreen = () => {
  const router = useRouter();
  const { toast } = useToast();
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const animatedMessageIdsRef = useRef<Set<string>>(new Set());
  const idleHintShownRef = useRef(false);
  const [textDraft, setTextDraft] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const micMenuRef = useRef<HTMLDivElement | null>(null);
  const micMenuButtonRef = useRef<HTMLButtonElement | null>(null);
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
    refreshMicrophones,
    retryConnection,
    selectedMicrophoneId,
    sendTextPrompt,
    sessionInfo,
    startListening,
    updateSelectedMicrophoneId,
    voiceState
  } = useLiveSession({
    apiKey: value,
    onMicFallback: () => {
      toast("Selected microphone is unavailable. Switched to the default input.", { variant: "info" });
      void refreshMicrophones();
    }
  });

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

  const getMobileStatusLabel = () => {
    switch (voiceState) {
      case "connecting":
        return "Connecting";
      case "listening":
        return "Listening";
      case "assistant-responding":
        return "Responding";
      case "error":
        return "Error";
      default:
        return isChatActive ? "Ready" : "Idle";
    }
  };

  const handleTranscriptScroll = useCallback(() => {
    const viewport = transcriptViewportRef.current;
    if (!viewport) {
      return;
    }
    const { scrollHeight, scrollTop, clientHeight } = viewport;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    const viewport = transcriptViewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth"
    });
  }, []);

  const handleTextInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const trimmed = textDraft.trim();
    if (!trimmed) {
      return;
    }

    setTextDraft("");
    sendTextPrompt(trimmed, { startListeningAfterAssistantReply: true });
  }, [sendTextPrompt, textDraft]);

  const handleBack = useCallback(() => {
    endConversation();
    router.push("/");
  }, [endConversation, router]);

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
    if (!micMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        !micMenuRef.current?.contains(event.target as Node) &&
        !micMenuButtonRef.current?.contains(event.target as Node)
      ) {
        setMicMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMicMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [micMenuOpen]);

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

  useEffect(() => {
    if (errorMessage) {
      toast(errorMessage, {
        variant: "error",
        action: { label: "Reset session", onClick: retryConnection }
      });
    }
  }, [errorMessage, retryConnection, toast]);

  useEffect(() => {
    if (
      !idleHintShownRef.current &&
      voiceState === "idle" &&
      messages.length === 0 &&
      isChatActive
    ) {
      const timer = setTimeout(() => {
        idleHintShownRef.current = true;
        toast("Tap Start or type a message to begin.");
      }, 30_000);

      return () => clearTimeout(timer);
    }
  }, [isChatActive, messages.length, toast, voiceState]);

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch("/api/live/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey: nextKey }),
        signal: controller.signal
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(getGeminiValidationErrorMessage(payload.error));
      }

      setValue(nextKey);
      setIsSettingsOpen(false);
    } catch (saveError) {
      setSettingsError(
        saveError instanceof DOMException && saveError.name === "AbortError"
          ? "Request timed out. Please try again."
          : getGeminiClientErrorMessage(saveError)
      );
    } finally {
      clearTimeout(timeoutId);
      setIsSavingKey(false);
    }
  };

  if (!ready || !value) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/50 bg-surface/80 px-3 py-2 backdrop-blur-lg sm:px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8"
              aria-label="Back to setup"
              title="Back"
              onClick={() => {
                router.push("/");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
          <ThemeToggle className="h-8 w-8" />
        </header>
        <main className="flex flex-1 items-center justify-center">
          <LoadingDots size="lg" className="text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header
        ref={settingsPanelRef}
        className="relative z-20 flex items-center justify-between border-b border-border/50 bg-surface/80 px-3 py-2 backdrop-blur-lg sm:px-4"
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            aria-label="Back to setup"
            title="Back"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
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

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={transcriptViewportRef}
          className="flex-1 overflow-y-auto px-3 py-4 sm:px-6"
          onScroll={handleTranscriptScroll}
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
                    {message.isDraft ? (
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        <LoadingDots size="sm" />
                      </div>
                    ) : null}
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
                <p className="text-base font-medium text-foreground">ShopTalk</p>
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
        {showScrollButton ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="absolute bottom-4 right-3 z-10 rounded-full shadow-lg sm:right-6"
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        ) : null}
      </main>

      <footer className="z-20 border-t border-border/50 bg-surface/80 px-3 py-3 backdrop-blur-lg sm:px-4">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <button
              ref={micMenuButtonRef}
              type="button"
              disabled={microphoneSelectionDisabled || isLoadingMicrophones || microphoneDevices.length === 0}
              onClick={() => setMicMenuOpen((prev) => !prev)}
              className="flex h-9 w-[12rem] shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background px-3 text-sm text-muted-foreground outline-none transition-colors hover:border-border hover:text-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Select microphone"
              aria-expanded={micMenuOpen}
              aria-haspopup="listbox"
            >
              <Mic2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs">
                {isLoadingMicrophones
                  ? "Loading..."
                  : microphoneDevices.find((d) => d.deviceId === selectedMicrophoneId)?.label ?? "Select mic"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${micMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {micMenuOpen && typeof document !== "undefined"
              ? createPortal(
                  <div
                    ref={micMenuRef}
                    role="listbox"
                    aria-label="Microphones"
                    className="fixed z-50 max-h-60 min-w-48 overflow-y-auto rounded-xl border border-border/60 bg-surface p-1 shadow-xl backdrop-blur-xl dark:shadow-black/20 animate-fade-in"
                    style={{
                      left: Math.max(
                        (micMenuButtonRef.current?.getBoundingClientRect().left ?? 0),
                        0
                      ),
                      bottom:
                        window.innerHeight - (micMenuButtonRef.current?.getBoundingClientRect().top ?? 0) + 2,
                      width: "12rem"
                    }}
                  >
                    {microphoneDevices.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No microphones found</div>
                    ) : (
                      microphoneDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          type="button"
                          role="option"
                          aria-selected={device.deviceId === selectedMicrophoneId}
                          onClick={() => {
                            updateSelectedMicrophoneId(device.deviceId);
                            setMicMenuOpen(false);
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Mic2 className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-left">{device.label}</span>
                          {device.deviceId === selectedMicrophoneId && (
                            <Mic className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>,
                  document.body
                )
              : null}
          </div>
          <Input
            type="text"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            onKeyDown={handleTextInput}
            placeholder="Type a message..."
            disabled={voiceState === "connecting"}
            className="h-9 min-w-0 flex-1 rounded-lg border-border/50 bg-background text-sm"
            autoComplete="off"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
            <VoiceIndicator state={voiceState} size="sm" />
            <span>{getMobileStatusLabel()}</span>
          </div>
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
