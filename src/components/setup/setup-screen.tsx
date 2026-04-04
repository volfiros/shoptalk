"use client";

import { startTransition, useMemo, useState } from "react";
import { Clipboard, Copy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageFrame } from "@/components/layout/page-frame";
import { SurfacePanel } from "@/components/layout/surface-panel";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSessionValue } from "@/hooks/use-session-value";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  getGeminiClientErrorMessage,
  getGeminiValidationErrorMessage,
  validateGeminiApiKey
} from "@/lib/session";

export const SetupScreen = () => {
  const router = useRouter();
  const { ready, value, setValue } = useSessionValue(GEMINI_API_KEY_STORAGE_KEY);
  const [draftKey, setDraftKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const helpText = useMemo(() => {
    if (!ready) {
      return "Checking the current browser session.";
    }

    if (value) {
      return "A Gemini key is already saved for this browser session. You can replace it or continue.";
    }

    return "The key is kept only in this browser session and is not persisted on the server.";
  }, [ready, value]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextKey = (draftKey || value || "").trim();
    const nextError = validateGeminiApiKey(nextKey);

    setError(nextError);

    if (nextError) {
      return;
    }

    setIsSubmitting(true);

    void (async () => {
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

        startTransition(() => {
          router.push("/chat");
        });
      } catch (submissionError) {
        setError(
          getGeminiClientErrorMessage(submissionError)
        );
        setIsSubmitting(false);
      }
    })();
  };

  const handleClear = () => {
    setDraftKey("");
    setError(null);
    setClipboardMessage(null);
    setValue(null);
  };

  const handlePaste = async () => {
    try {
      const pastedValue = await navigator.clipboard.readText();

      if (!pastedValue.trim()) {
        setClipboardMessage("Clipboard is empty.");
        return;
      }

      setDraftKey(pastedValue);
      setError(null);
      setClipboardMessage("Key pasted from clipboard.");
    } catch {
      setClipboardMessage("Clipboard paste is not available here.");
    }
  };

  const handleCopy = async () => {
    const nextValue = (draftKey || value || "").trim();

    if (!nextValue) {
      setClipboardMessage("There is no key to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(nextValue);
      setClipboardMessage("Key copied to clipboard.");
    } catch {
      setClipboardMessage("Clipboard copy is not available here.");
    }
  };

  return (
    <AppShell>
      <PageFrame
        title="Add your Gemini key"
        description="Use your Gemini API key to start a local voice support session and continue into the chat interface."
        headerClassName="mx-auto text-center"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <SurfacePanel
            title="Session setup"
            description="The key stays in this browser session only. Once it is saved, the chat view can use it for the voice connection."
          >
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="gemini-api-key">Gemini API key</FieldLabel>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <Input
                        id="gemini-api-key"
                        type="password"
                        value={draftKey}
                        onChange={(event) => {
                          setDraftKey(event.target.value);
                          if (error) setError(null);
                        }}
                        aria-invalid={Boolean(error)}
                        placeholder="Paste your Gemini API key"
                        autoComplete="off"
                        disabled={!ready || isSubmitting}
                        className={draftKey ? "pr-10" : ""}
                      />
                      {draftKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftKey("");
                            setError(null);
                          }}
                          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Clear typed key"
                          title="Clear typed key"
                          disabled={!ready || isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 rounded-xl"
                      aria-label="Paste Gemini API key"
                      title="Paste key"
                      disabled={!ready || isSubmitting}
                      onClick={handlePaste}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 rounded-xl"
                      aria-label="Copy Gemini API key"
                      title="Copy key"
                      disabled={!ready || isSubmitting}
                      onClick={handleCopy}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldDescription>{helpText}</FieldDescription>
                  <FieldError>{error}</FieldError>
                </Field>
              </FieldGroup>

              <div
                aria-live="polite"
                className="flex items-center rounded-xl border border-border/60 bg-muted/45 px-5 py-4 text-sm text-muted-foreground shadow-inner"
              >
                {ready
                  ? "Setup stays in the browser session only."
                  : "Loading session state..."}
              </div>

              {clipboardMessage ? (
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  {clipboardMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" disabled={!ready || isSubmitting}>
                  {isSubmitting ? "Opening chat..." : "Start voice chat"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!ready || (!value && !draftKey)}
                  onClick={handleClear}
                >
                  Clear saved key
                </Button>
              </div>
            </form>
          </SurfacePanel>
        </div>
      </PageFrame>
    </AppShell>
  );
};
