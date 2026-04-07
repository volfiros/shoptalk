"use client";

import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  LIVE_MODEL,
  LIVE_SESSION_CONFIG,
  LIVE_VOICE
} from "@/lib/live/config";
import {
  getGeminiClientErrorMessage,
  getGeminiValidationErrorMessage
} from "@/lib/session";

type VoiceState =
  | "connecting"
  | "idle"
  | "listening"
  | "assistant-responding"
  | "error";

type AudioInputMode = "inactive" | "sending" | "monitoring";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  isDraft?: boolean;
  wasInterrupted?: boolean;
};

type MessageUpdateMode = "merge-transcript";

type SessionPayload = {
  token: string;
  model: string;
  voice: string;
  error?: string;
};

type UseLiveSessionOptions = {
  apiKey: string | null;
};

type MicrophoneDevice = {
  deviceId: string;
  label: string;
};

type BrowserAudioContext = AudioContext;

type WindowWithAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type LiveSessionConnectionState = {
  conn?: {
    ws?: {
      readyState?: number;
    };
  };
};

type ScriptProcessorNodeWithLegacyFactory = ScriptProcessorNode & {
  connect(destinationNode: AudioNode): void;
  disconnect(): void;
};

const createId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const MICROPHONE_STORAGE_KEY = "shoptalk-microphone-id";
const INTERRUPTION_SAMPLE_THRESHOLD = 0.018;
const USER_TURN_SILENCE_MS = 1400;

const decodeBase64ToBytes = (base64: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const downsamplePcm = (
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
) => {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / sampleRateRatio);
  const output = new Float32Array(outputLength);

  let outputIndex = 0;
  let inputIndex = 0;

  while (outputIndex < outputLength) {
    const nextInputIndex = Math.round((outputIndex + 1) * sampleRateRatio);
    let total = 0;
    let sampleCount = 0;

    for (let index = inputIndex; index < nextInputIndex && index < input.length; index += 1) {
      total += input[index];
      sampleCount += 1;
    }

    output[outputIndex] = sampleCount > 0 ? total / sampleCount : 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }

  return output;
};

const pcmFloat32ToBase64 = (input: Float32Array) => {
  const bytes = new Uint8Array(input.length * 2);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    const pcmValue = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    const clampedValue = Math.round(pcmValue);
    const byteOffset = index * 2;

    bytes[byteOffset] = clampedValue & 0xff;
    bytes[byteOffset + 1] = (clampedValue >> 8) & 0xff;
  }

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
};

const getMicrophoneErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Microphone access could not be started.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow microphone access and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found for this browser.";
    case "NotReadableError":
    case "TrackStartError":
      return "The microphone is currently unavailable because another app may be using it.";
    case "OverconstrainedError":
      return "The selected microphone is no longer available.";
    default:
      return error.message || "Microphone access could not be started.";
  }
};

export const useLiveSession = ({ apiKey }: UseLiveSessionOptions) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isChatActive, setIsChatActive] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingMicrophones, setIsLoadingMicrophones] = useState(true);
  const [microphoneDevices, setMicrophoneDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>("");
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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<BrowserAudioContext | null>(null);
  const inputSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const inputProcessorNodeRef = useRef<ScriptProcessorNodeWithLegacyFactory | null>(null);
  const inputSilenceNodeRef = useRef<GainNode | null>(null);
  const activeUserMessageIdRef = useRef<string | null>(null);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const playbackCursorRef = useRef(0);
  const activePlaybackCountRef = useRef(0);
  const turnCompletePendingRef = useRef(false);
  const sessionIsOpenRef = useRef(false);
  const shouldSendAudioStreamEndRef = useRef(true);
  const shouldIgnoreCurrentTurnRef = useRef(false);
  const isInterruptingAssistantRef = useRef(false);
  const currentVoiceStateRef = useRef<VoiceState>("idle");
  const audioInputModeRef = useRef<AudioInputMode>("inactive");
  const lastSpeechAtRef = useRef<number | null>(null);
  const shouldCloseAfterAssistantTurnRef = useRef(false);
  const pendingStartChatRef = useRef(false);
  const pendingStartChatAllowDuringAssistantResponseRef = useRef(false);
  const pendingTextPromptRef = useRef<string | null>(null);
  const shouldStartListeningAfterAssistantTurnRef = useRef(false);
  const startListeningRef = useRef<((options?: { allowWhileAssistantResponding?: boolean }) => Promise<void>) | null>(null);

  const persistMicrophoneId = (deviceId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(MICROPHONE_STORAGE_KEY, deviceId);
  };

  const clearActiveMessageRefs = useCallback(() => {
    activeAssistantMessageIdRef.current = null;
    activeUserMessageIdRef.current = null;
  }, []);

  const refreshMicrophones = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setIsLoadingMicrophones(false);
      setMicrophoneDevices([]);
      return;
    }

    setIsLoadingMicrophones(true);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      const nextDevices = audioInputs.map((device, index) => ({
        deviceId: device.deviceId,
        label:
          device.label.trim().length > 0
            ? device.label
            : `Microphone ${index + 1}`
      }));

      setMicrophoneDevices(nextDevices);
      setSelectedMicrophoneId((currentValue) => {
        const storedValue =
          currentValue ||
          (typeof window !== "undefined"
            ? window.sessionStorage.getItem(MICROPHONE_STORAGE_KEY) ?? ""
            : "");

        const matchedDevice = nextDevices.find(
          (device) => device.deviceId === storedValue
        );
        const fallbackDevice =
          nextDevices.find((device) => device.deviceId === "default") ??
          nextDevices[0];
        const nextValue = matchedDevice?.deviceId ?? fallbackDevice?.deviceId ?? "";

        if (nextValue) {
          persistMicrophoneId(nextValue);
        }

        return nextValue;
      });
    } finally {
      setIsLoadingMicrophones(false);
    }
  }, []);

  const isSessionWritable = (session: object | null | undefined) => {
    if (!session || !sessionIsOpenRef.current) {
      return false;
    }

    const readyState = (session as LiveSessionConnectionState).conn?.ws?.readyState;

    if (typeof readyState !== "number") {
      return true;
    }

    return readyState === WebSocket.OPEN;
  };

  const resetConversationState = useCallback(() => {
    clearActiveMessageRefs();
    setMessages([]);
  }, [clearActiveMessageRefs]);

  const appendMessage = useCallback((role: "user" | "assistant", body: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createId(),
        role,
        body
      }
    ]);
  }, []);

  const dispatchTextPrompt = useCallback((
    session: NonNullable<typeof sessionRef.current>,
    prompt: string
  ) => {
    appendMessage("user", prompt);
    setErrorMessage(null);
    setVoiceState("assistant-responding");
    session.sendRealtimeInput({
      text: prompt
    });
  }, [appendMessage]);

  const mergeTranscriptText = (currentText: string, nextText: string) => {
    if (!currentText) {
      return nextText;
    }

    if (nextText.startsWith(currentText)) {
      return nextText;
    }

    if (currentText.endsWith(nextText)) {
      return currentText;
    }

    return `${currentText}${nextText}`;
  };

  const upsertDraftMessage = useCallback((
    role: "user" | "assistant",
    text: string,
    options?: {
      finished?: boolean;
      mode?: MessageUpdateMode;
    }
  ) => {
    const finished = options?.finished ?? false;
    const mode = options?.mode;
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
        body:
          existingIndex !== -1 && mode === "merge-transcript"
            ? mergeTranscriptText(currentMessages[existingIndex].body, text)
            : text,
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
  }, []);

  const finalizeDraftMessage = useCallback((role: "user" | "assistant") => {
    const targetRef =
      role === "user" ? activeUserMessageIdRef : activeAssistantMessageIdRef;
    const targetId = targetRef.current;

    if (!targetId) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === targetId
          ? {
              ...message,
              isDraft: false
            }
          : message
      )
    );

    targetRef.current = null;
  }, []);

  const markAssistantMessageInterrupted = useCallback(() => {
    const targetId = activeAssistantMessageIdRef.current;

    if (!targetId) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === targetId
          ? {
              ...message,
              isDraft: false,
              wasInterrupted: true
            }
          : message
      )
    );

    activeAssistantMessageIdRef.current = null;
  }, []);

  const stopMediaStream = () => {
    inputProcessorNodeRef.current?.disconnect();
    inputProcessorNodeRef.current = null;
    inputSourceNodeRef.current?.disconnect();
    inputSourceNodeRef.current = null;
    inputSilenceNodeRef.current?.disconnect();
    inputSilenceNodeRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const finishAssistantTurn = useEffectEvent(() => {
    if (
      activePlaybackCountRef.current > 0 ||
      audioInputModeRef.current === "sending"
    ) {
      return;
    }

    turnCompletePendingRef.current = false;
    clearActiveMessageRefs();
    audioInputModeRef.current = isChatActive ? "monitoring" : "inactive";

    if (shouldCloseAfterAssistantTurnRef.current) {
      shouldCloseAfterAssistantTurnRef.current = false;
      endConversation();
      return;
    }

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

  const closeAudioOutput = useCallback(async () => {
    activePlaybackCountRef.current = 0;
    playbackCursorRef.current = 0;
    turnCompletePendingRef.current = false;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;

    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
  }, []);

  const interruptAssistantTurn = useCallback(async () => {
    if (
      isInterruptingAssistantRef.current ||
      currentVoiceStateRef.current !== "assistant-responding"
    ) {
      return;
    }

    isInterruptingAssistantRef.current = true;
    shouldIgnoreCurrentTurnRef.current = true;
    turnCompletePendingRef.current = false;
    markAssistantMessageInterrupted();
    audioInputModeRef.current = "sending";
    lastSpeechAtRef.current = performance.now();
    await closeAudioOutput();
    setErrorMessage(null);
    setVoiceState("listening");
    isInterruptingAssistantRef.current = false;
  }, [closeAudioOutput, markAssistantMessageInterrupted]);

  useEffect(() => {
    currentVoiceStateRef.current = voiceState;
  }, [voiceState]);

  const closeAudioInput = useCallback(async () => {
    stopMediaStream();
    audioInputModeRef.current = "inactive";
    lastSpeechAtRef.current = null;

    const inputAudioContext = inputAudioContextRef.current;
    inputAudioContextRef.current = null;

    if (inputAudioContext && inputAudioContext.state !== "closed") {
      await inputAudioContext.close();
    }
  }, []);

  const shutdownLiveSession = useCallback(
    async (
      nextErrorMessage?: string,
      options?: {
        skipSessionClose?: boolean;
      }
    ) => {
      sessionIsOpenRef.current = false;
      shouldSendAudioStreamEndRef.current = false;
      pendingStartChatRef.current = false;
      pendingStartChatAllowDuringAssistantResponseRef.current = false;
      pendingTextPromptRef.current = null;
      shouldStartListeningAfterAssistantTurnRef.current = false;
      setShouldConnect(false);
      setIsSessionReady(false);

      await closeAudioInput();

      const session = sessionRef.current;
      sessionRef.current = null;

      if (session && !options?.skipSessionClose) {
        session.close();
      }

      await closeAudioOutput();

      setSessionInfo({
        sessionId: null,
        model: LIVE_MODEL,
        voice: LIVE_VOICE
      });
      clearActiveMessageRefs();
      shouldIgnoreCurrentTurnRef.current = false;
      isInterruptingAssistantRef.current = false;
      audioInputModeRef.current = "inactive";
      lastSpeechAtRef.current = null;
      shouldCloseAfterAssistantTurnRef.current = false;
      setIsChatActive(false);

      if (nextErrorMessage) {
        setErrorMessage(nextErrorMessage);
        setVoiceState("error");
        return;
      }

      setErrorMessage(null);
      setVoiceState("idle");
    },
    [clearActiveMessageRefs, closeAudioInput, closeAudioOutput]
  );

  const endConversation = useCallback(() => {
    resetConversationState();
    void shutdownLiveSession();
  }, [resetConversationState, shutdownLiveSession]);

  useEffect(() => {
    void refreshMicrophones();

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshMicrophones();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshMicrophones]);

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
    const session = sessionRef.current;

    if (!functionCalls.length || !session || !isSessionWritable(session)) {
      return;
    }

    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        if (functionCall.name === "request_end_chat") {
          shouldCloseAfterAssistantTurnRef.current = true;

          return {
            id: functionCall.id,
            name: functionCall.name,
            response: {
              ok: true
            }
          };
        }

        try {
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
        } catch {
          return {
            id: functionCall.id,
            name: functionCall.name,
            response: {
              ok: false,
              error: "tool_request_failed"
            }
          };
        }
      })
    );

    if (sessionRef.current !== session || !isSessionWritable(session)) {
      return;
    }

    try {
      session.sendToolResponse({
        functionResponses
      });
    } catch (error) {
      void shutdownLiveSession(
        error instanceof Error
          ? error.message
          : "Tool responses could not be sent."
      );
    }
  });

  useEffect(() => {
    return () => {
      void shutdownLiveSession();
    };
  }, [shutdownLiveSession]);

  useEffect(() => {
    if (!apiKey || !shouldConnect || sessionRef.current) {
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

        const payload = (await response.json()) as SessionPayload;

        if (!response.ok) {
          throw new Error(getGeminiValidationErrorMessage(payload.error));
        }

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
                sessionIsOpenRef.current = true;
                setVoiceState("idle");
              }
            },
            onmessage: (message: LiveServerMessage) => {
              if (cancelled) {
                return;
              }

              if (shouldIgnoreCurrentTurnRef.current) {
                if (message.serverContent?.turnComplete) {
                  shouldIgnoreCurrentTurnRef.current = false;
                  clearActiveMessageRefs();
                }

                return;
              }

              if (message.setupComplete) {
                setIsSessionReady(true);
                setSessionInfo({
                  sessionId: message.setupComplete.sessionId ?? null,
                  model: payload.model,
                  voice: payload.voice
                });
                return;
              }

              if (message.toolCall) {
                finalizeDraftMessage("user");
                setVoiceState("assistant-responding");
                void handleToolCall(message.toolCall);
                return;
              }

              if (message.data) {
                finalizeDraftMessage("user");
                setVoiceState("assistant-responding");
                void queueAssistantAudio(message.data).catch((error) => {
                  void shutdownLiveSession(
                    error instanceof Error
                      ? error.message
                      : "Audio playback could not start."
                  );
                });
              }

              if (message.serverContent?.inputTranscription?.text) {
                const inputText = message.serverContent.inputTranscription.text;
                const inputFinished = Boolean(
                  message.serverContent.inputTranscription.finished
                );

                upsertDraftMessage(
                  "user",
                  inputText,
                  {
                    mode: "merge-transcript"
                  }
                );

                if (inputFinished) {
                  finalizeDraftMessage("user");
                }
              }

              if (message.serverContent?.outputTranscription?.text) {
                finalizeDraftMessage("user");
                setVoiceState("assistant-responding");
                upsertDraftMessage(
                  "assistant",
                  message.serverContent.outputTranscription.text,
                  {
                    mode: "merge-transcript"
                  }
                );
              }

              if (message.serverContent?.generationComplete) {
                finalizeDraftMessage("assistant");

                if (shouldStartListeningAfterAssistantTurnRef.current) {
                  shouldStartListeningAfterAssistantTurnRef.current = false;
                  void startListeningRef.current?.({
                    allowWhileAssistantResponding: true
                  });
                }
              }

              if (message.serverContent?.turnComplete) {
                finalizeDraftMessage("assistant");
                turnCompletePendingRef.current = true;
                finishAssistantTurn();
              }
            },
            onerror: () => {
              if (!cancelled) {
                void shutdownLiveSession("The live session hit an error.");
              }
            },
            onclose: () => {
              if (!cancelled) {
                sessionIsOpenRef.current = false;
                void shutdownLiveSession("The live session closed.", {
                  skipSessionClose: true
                });
              }
            }
          }
        });

        if (cancelled) {
          session.close();
          return;
        }

        sessionRef.current = session;
        sessionIsOpenRef.current = true;
        shouldSendAudioStreamEndRef.current = true;
      } catch (error) {
        if (!cancelled) {
          void shutdownLiveSession(getGeminiClientErrorMessage(error));
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
    };
  }, [
    apiKey,
    clearActiveMessageRefs,
    finalizeDraftMessage,
    shouldConnect,
    shutdownLiveSession,
    upsertDraftMessage
  ]);

  const startListening = useCallback(async (options?: {
    allowWhileAssistantResponding?: boolean;
  }) => {
    const allowWhileAssistantResponding =
      options?.allowWhileAssistantResponding ?? false;

    if (
      isChatActive ||
      (
        voiceState !== "idle" &&
        !(allowWhileAssistantResponding && voiceState === "assistant-responding")
      )
    ) {
      return;
    }

    if (!sessionRef.current) {
      pendingStartChatRef.current = true;
      pendingStartChatAllowDuringAssistantResponseRef.current = allowWhileAssistantResponding;
      setShouldConnect(true);
      return;
    }

    try {
      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio:
            selectedMicrophoneId && selectedMicrophoneId !== "default"
              ? {
                  deviceId: {
                    exact: selectedMicrophoneId
                  }
                }
              : true
        });
      } catch (error) {
        if (selectedMicrophoneId && selectedMicrophoneId !== "default") {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setErrorMessage("Selected microphone was unavailable. Switched to the default input.");
          setSelectedMicrophoneId("default");
          persistMicrophoneId("default");
        } else {
          throw error;
        }
      }

      void refreshMicrophones();
      const AudioContextConstructor =
        window.AudioContext ??
        (window as WindowWithAudioContext).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const inputAudioContext = new AudioContextConstructor();
      const inputSourceNode = inputAudioContext.createMediaStreamSource(mediaStream);
      const inputProcessorNode = inputAudioContext.createScriptProcessor(
        4096,
        1,
        1
      ) as ScriptProcessorNodeWithLegacyFactory;
      const inputSilenceNode = inputAudioContext.createGain();
      inputSilenceNode.gain.value = 0;

      audioInputModeRef.current = "monitoring";
      lastSpeechAtRef.current = null;
      mediaStreamRef.current = mediaStream;
      inputAudioContextRef.current = inputAudioContext;
      inputSourceNodeRef.current = inputSourceNode;
      inputProcessorNodeRef.current = inputProcessorNode;
      inputSilenceNodeRef.current = inputSilenceNode;
      setIsChatActive(true);
      setErrorMessage(null);

      if (!(allowWhileAssistantResponding && currentVoiceStateRef.current === "assistant-responding")) {
        setVoiceState("idle");
      }

      inputProcessorNode.onaudioprocess = (event) => {
        const activeSession = sessionRef.current;

        if (!activeSession || !isSessionWritable(activeSession)) {
          return;
        }

        try {
          const channelData = event.inputBuffer.getChannelData(0);
          const downsampledAudio = downsamplePcm(
            channelData,
            inputAudioContext.sampleRate,
            16_000
          );
          const peakAmplitude = downsampledAudio.reduce((peak, sample) => {
            return Math.max(peak, Math.abs(sample));
          }, 0);

          if (
            currentVoiceStateRef.current === "assistant-responding" &&
            audioInputModeRef.current === "monitoring"
          ) {
            if (
              peakAmplitude >= INTERRUPTION_SAMPLE_THRESHOLD &&
              !isInterruptingAssistantRef.current
            ) {
              void interruptAssistantTurn();
            }

            if (!shouldIgnoreCurrentTurnRef.current) {
              return;
            }
          }

          if (audioInputModeRef.current === "monitoring") {
            if (peakAmplitude < INTERRUPTION_SAMPLE_THRESHOLD) {
              return;
            }

            audioInputModeRef.current = "sending";
            lastSpeechAtRef.current = performance.now();
            setErrorMessage(null);
            setVoiceState("listening");
          } else if (peakAmplitude < INTERRUPTION_SAMPLE_THRESHOLD) {
            if (
              lastSpeechAtRef.current &&
              performance.now() - lastSpeechAtRef.current >= USER_TURN_SILENCE_MS
            ) {
              const writableSession = sessionRef.current;

              audioInputModeRef.current = "monitoring";
              lastSpeechAtRef.current = null;

              if (
                writableSession &&
                shouldSendAudioStreamEndRef.current &&
                isSessionWritable(writableSession)
              ) {
                try {
                  writableSession.sendRealtimeInput({
                    audioStreamEnd: true
                  });
                  setVoiceState("idle");
                } catch (error) {
                  void shutdownLiveSession(
                    error instanceof Error
                      ? error.message
                      : "Audio streaming could not stop cleanly."
                  );
                }
              }
            }

            return;
          } else {
            lastSpeechAtRef.current = performance.now();
          }

          if (sessionRef.current !== activeSession || !isSessionWritable(activeSession)) {
            return;
          }

          activeSession.sendRealtimeInput({
            audio: {
              data: pcmFloat32ToBase64(downsampledAudio),
              mimeType: "audio/pcm;rate=16000"
            }
          });
        } catch (error) {
          void shutdownLiveSession(
            error instanceof Error
              ? error.message
              : "Audio streaming could not continue."
          );
        }
      };

      inputSourceNode.connect(inputProcessorNode);
      inputProcessorNode.connect(inputSilenceNode);
      inputSilenceNode.connect(inputAudioContext.destination);

      if (inputAudioContext.state === "suspended") {
        void inputAudioContext.resume();
      }
    } catch (error) {
      setIsChatActive(false);
      void shutdownLiveSession(
        getMicrophoneErrorMessage(error)
      );
    }
  }, [
    isChatActive,
    interruptAssistantTurn,
    refreshMicrophones,
    selectedMicrophoneId,
    shutdownLiveSession,
    voiceState
  ]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const sendTextPrompt = useCallback((
    prompt: string,
    options?: {
      startListeningAfterAssistantReply?: boolean;
    }
  ) => {
    const nextPrompt = prompt.trim();

    if (!nextPrompt) {
      return;
    }

    shouldStartListeningAfterAssistantTurnRef.current =
      options?.startListeningAfterAssistantReply ?? false;

    if (sessionRef.current && isSessionWritable(sessionRef.current)) {
      try {
        dispatchTextPrompt(sessionRef.current, nextPrompt);
        return;
      } catch (error) {
        shouldStartListeningAfterAssistantTurnRef.current = false;
        void shutdownLiveSession(
          error instanceof Error
            ? error.message
            : "The prompt could not be sent."
        );
        return;
      }
    }

    pendingTextPromptRef.current = nextPrompt;
    setShouldConnect(true);
  }, [dispatchTextPrompt, shutdownLiveSession]);

  useEffect(() => {
    const allowWhileAssistantResponding =
      pendingStartChatAllowDuringAssistantResponseRef.current;

    if (
      !pendingStartChatRef.current ||
      !sessionRef.current ||
      isChatActive ||
      (
        voiceState !== "idle" &&
        !(allowWhileAssistantResponding && voiceState === "assistant-responding")
      )
    ) {
      return;
    }

    pendingStartChatRef.current = false;
    pendingStartChatAllowDuringAssistantResponseRef.current = false;
    void startListening({ allowWhileAssistantResponding });
  }, [isChatActive, startListening, voiceState]);

  useEffect(() => {
    if (
      !pendingTextPromptRef.current ||
      !sessionRef.current ||
      !isSessionReady ||
      voiceState !== "idle"
    ) {
      return;
    }

    const nextPrompt = pendingTextPromptRef.current;
    pendingTextPromptRef.current = null;

    if (nextPrompt) {
      try {
        dispatchTextPrompt(sessionRef.current, nextPrompt);
      } catch (error) {
        void shutdownLiveSession(
          error instanceof Error
            ? error.message
            : "The prompt could not be sent."
        );
      }
    }
  }, [dispatchTextPrompt, isSessionReady, shutdownLiveSession, voiceState]);

  const updateSelectedMicrophoneId = (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);
    persistMicrophoneId(deviceId);
  };

  const retryConnection = () => {
    window.location.reload();
  };

  return {
    errorMessage,
    isChatActive,
    messages,
    microphoneDevices,
    isLoadingMicrophones,
    endConversation,
    retryConnection,
    selectedMicrophoneId,
    sessionInfo,
    sendTextPrompt,
    startListening,
    updateSelectedMicrophoneId,
    voiceState
  };
};
