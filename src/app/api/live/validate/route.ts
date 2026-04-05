import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { normalizeGeminiError } from "@/lib/gemini-errors";

type ValidateBody = {
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
  let body: ValidateBody;

  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "missing_api_key" }, { status: 400 });
  }

  try {
    const ai = buildClient(apiKey);

    await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        httpOptions: GEMINI_HTTP_OPTIONS
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const normalizedError = normalizeGeminiError(error);

    return NextResponse.json(
      { ok: false, error: normalizedError.code },
      { status: normalizedError.status }
    );
  }
};
