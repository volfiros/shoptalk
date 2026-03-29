"use client";

import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  LIVE_MODEL,
  LIVE_SESSION_CONFIG,
  LIVE_VOICE
} from "@/lib/live/config";

type VoiceState =
  | "connecting"
  | "idle"
  | "listening"
  | "assistant-responding"
  | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  title: string;
  body: string;
  isDraft?: boolean;
};

type SessionPayload = {
  token: string;
  model: string;
  voice: string;
};

type UseLiveSessionOptions = {
  apiKey: string | null;
};

const createId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4"
];

const getRecorderMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  return (
    preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ??
    ""
  );
};

const browserBlobToSdkBlob = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return {
    data: window.btoa(binary),
    mimeType: blob.type || "audio/webm"
  };
};

const decodeBase64ToBytes = (base64: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

type BrowserAudioContext = AudioContext;

type WindowWithAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export const useLiveSession = ({ apiKey }: UseLiveSessionOptions) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string | null;
    model: string;
    voice: string;
  }>({
    sessionId: null,
    model: LIVE_MODEL,
    voice: LIVE_VOICE
  });

  const sessionRef = useRef<Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null>(
    null
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeUserMessageIdRef = useRef<string | null>(null);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const stoppedByUserRef = useRef(false);
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const playbackCursorRef = useRef(0);
  const activePlaybackCountRef = useRef(0);
  const turnCompletePendingRef = useRef(false);

  const upsertDraftMessage = (
    role: "user" | "assistant",
    title: string,
    text: string,
    finished = false
  ) => {
    const targetRef =
      role === "user" ? activeUserMessageIdRef : activeAssistantMessageIdRef;
    const targetId = targetRef.current ?? createId();

    targetRef.current = targetId;

    setMessages((currentMessages) => {
      const existingIndex = currentMessages.findIndex(
        (message) => message.id === targetId
      );

      const nextMessage: ChatMessage = {
        id: targetId,
        role,
        title,
        body: text,
        isDraft: !finished
      };

      if (existingIndex === -1) {
        return [...currentMessages, nextMessage];
      }

      const nextMessages = [...currentMessages];
      nextMessages[existingIndex] = nextMessage;
      return nextMessages;
    });

    if (finished) {
      targetRef.current = null;
    }
  };

  const stopMediaStream = () => {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const finishAssistantTurn = useEffectEvent(() => {
    if (activePlaybackCountRef.current > 0 || mediaRecorderRef.current) {
      return;
    }

    activeAssistantMessageIdRef.current = null;
    activeUserMessageIdRef.current = null;
    turnCompletePendingRef.current = false;
    setVoiceState("idle");
  });

  const ensureAudioContext = async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      return audioContextRef.current;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as WindowWithAudioContext).webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("Audio playback is not supported in this browser.");
    }

    const audioContext = new AudioContextConstructor({
      sampleRate: 24_000
    });

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    audioContextRef.current = audioContext;
    playbackCursorRef.current = audioContext.currentTime;

    return audioContext;
  };

  const queueAssistantAudio = useEffectEvent(async (base64Audio: string) => {
    const audioContext = await ensureAudioContext();
    const bytes = decodeBase64ToBytes(base64Audio);
    const pcm16 = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
    const float32 = new Float32Array(pcm16.length);

    pcm16.forEach((sample, index) => {
      float32[index] = sample / 32768;
    });

    const audioBuffer = audioContext.createBuffer(1, float32.length, 24_000);
    audioBuffer.copyToChannel(float32, 0);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const startAt = Math.max(playbackCursorRef.current, audioContext.currentTime);
    playbackCursorRef.current = startAt + audioBuffer.duration;
    activePlaybackCountRef.current += 1;

    source.addEventListener("ended", () => {
      activePlaybackCountRef.current = Math.max(0, activePlaybackCountRef.current - 1);

      if (turnCompletePendingRef.current) {
        finishAssistantTurn();
      }
    });

    source.start(startAt);
  });

  const handleToolCall = useEffectEvent(async (
    toolCall: NonNullable<LiveServerMessage["toolCall"]>
  ) => {
    const functionCalls = toolCall.functionCalls ?? [];

    if (!functionCalls.length || !sessionRef.current) {
      return;
    }

    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const response = await fetch("/api/support/tool", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            toolName: functionCall.name,
            args: functionCall.args ?? {}
          })
        });

        const payload = (await response.json()) as {
          error?: string;
          result?: unknown;
        };

        return {
          id: functionCall.id,
          name: functionCall.name,
          response: response.ok
            ? {
                ok: true,
                result: payload.result
              }
            : {
                ok: false,
                error: payload.error ?? "tool_failed"
              }
        };
      })
    );

    sessionRef.current.sendToolResponse({
      functionResponses
    });
  });

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    let cancelled = false;

    const connect = async () => {
      setVoiceState("connecting");
      setErrorMessage(null);

      try {
        const response = await fetch("/api/live/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ apiKey })
        });

        if (!response.ok) {
          throw new Error("Unable to start the live session.");
        }

        const payload = (await response.json()) as SessionPayload;

        if (!payload.token) {
          throw new Error("The live session token response was incomplete.");
        }

        const ai = new GoogleGenAI({
          apiKey: payload.token,
          httpOptions: {
            apiVersion: "v1alpha"
          }
        });

        const session = await ai.live.connect({
          model: payload.model,
          config: LIVE_SESSION_CONFIG,
          callbacks: {
            onopen: () => {
              if (!cancelled) {
                setVoiceState("idle");
              }
            },
            onmessage: (message: LiveServerMessage) => {
              if (cancelled) {
                return;
              }

              if (message.setupComplete?.sessionId) {
                setSessionInfo({
                  sessionId: message.setupComplete.sessionId,
                  model: payload.model,
                  voice: payload.voice
                });
                return;
              }

              if (message.toolCall) {
                setVoiceState("assistant-responding");
                void handleToolCall(message.toolCall);
                return;
              }

              if (message.data) {
                setVoiceState("assistant-responding");
                void queueAssistantAudio(message.data).catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "Audio playback could not start."
                  );
                  setVoiceState("error");
                });
              }

              if (message.serverContent?.inputTranscription?.text) {
                upsertDraftMessage(
                  "user",
                  "You",
                  message.serverContent.inputTranscription.text,
                  Boolean(message.serverContent.inputTranscription.finished)
                );
              }

              if (message.serverContent?.outputTranscription?.text) {
                setVoiceState("assistant-responding");
                upsertDraftMessage(
                  "assistant",
                  "Assistant",
                  message.serverContent.outputTranscription.text,
                  Boolean(message.serverContent.outputTranscription.finished)
                );
              }

              if (message.serverContent?.turnComplete) {
                turnCompletePendingRef.current = true;
                finishAssistantTurn();
              }
            },
            onerror: () => {
              if (!cancelled) {
                setErrorMessage("The live session hit an error.");
                setVoiceState("error");
              }
            },
            onclose: () => {
              if (!cancelled) {
                setVoiceState("error");
              }
            }
          }
        });

        if (cancelled) {
          session.close();
          return;
        }

        sessionRef.current = session;
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to connect the live session."
          );
          setVoiceState("error");
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      stopMediaStream();
      turnCompletePendingRef.current = false;
      sessionRef.current?.close();
      sessionRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      playbackCursorRef.current = 0;
      activePlaybackCountRef.current = 0;
    };
  }, [apiKey]);

  const startListening = async () => {
    if (!sessionRef.current || voiceState !== "idle") {
      return;
    }

    try {
      const mimeType = getRecorderMimeType();

      if (mimeType === null) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      await ensureAudioContext();

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(
        mediaStream,
        mimeType ? { mimeType } : undefined
      );

      stoppedByUserRef.current = false;
      mediaStreamRef.current = mediaStream;
      mediaRecorderRef.current = mediaRecorder;
      setErrorMessage(null);
      setVoiceState("listening");

      mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (!event.data.size || !sessionRef.current) {
          return;
        }

        const audioChunk = await browserBlobToSdkBlob(event.data);

        sessionRef.current.sendRealtimeInput({
          audio: audioChunk
        });
      });

      mediaRecorder.addEventListener("stop", () => {
        stopMediaStream();
        sessionRef.current?.sendRealtimeInput({
          audioStreamEnd: true
        });

        if (stoppedByUserRef.current) {
          setVoiceState("assistant-responding");
        }
      });

      mediaRecorder.start(250);
    } catch (error) {
      stopMediaStream();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Microphone access could not be started."
      );
      setVoiceState("error");
    }
  };

  const stopListening = () => {
    if (!mediaRecorderRef.current || voiceState !== "listening") {
      return;
    }

    stoppedByUserRef.current = true;
    mediaRecorderRef.current.stop();
  };

  const retryConnection = () => {
    window.location.reload();
  };

  return {
    errorMessage,
    messages,
    retryConnection,
    sessionInfo,
    startListening,
    stopListening,
    voiceState
  };
};
