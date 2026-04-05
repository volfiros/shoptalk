import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { normalizeGeminiError } from "@/lib/gemini-errors";
import { LIVE_MODEL, LIVE_SESSION_CONFIG, LIVE_VOICE } from "@/lib/live/config";

type SessionBody = {
  apiKey?: string;
};

const GEMINI_HTTP_OPTIONS = {
  apiVersion: "v1alpha",
  timeout: 12000,
  retryOptions: {
    attempts: 1
  }
} as const;

const buildClient = (apiKey: string) => {
  return new GoogleGenAI({
    apiKey,
    httpOptions: GEMINI_HTTP_OPTIONS
  });
};

export const POST = async (request: Request) => {
  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  try {
    const ai = buildClient(apiKey);
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: LIVE_SESSION_CONFIG
        },
        httpOptions: GEMINI_HTTP_OPTIONS
      }
    });

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
      voice: LIVE_VOICE
    });
  } catch (error) {
    const normalizedError = normalizeGeminiError(error);

    return NextResponse.json(
      { error: normalizedError.code },
      { status: normalizedError.status }
    );
  }
};
