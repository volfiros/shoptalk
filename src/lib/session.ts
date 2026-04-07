import type { GeminiErrorCode } from "@/lib/gemini-errors";

export const GEMINI_API_KEY_STORAGE_KEY = "shoptalk.gemini-api-key";

export const validateGeminiApiKey = (
  value: string,
  emptyMessage = "Enter a Gemini API key to continue."
) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return emptyMessage;
  }

  if (trimmedValue.length < 20) {
    return "Enter a full API key. The current value looks too short.";
  }

  return null;
};

export const getGeminiValidationErrorMessage = (error?: string) => {
  switch (error as GeminiErrorCode | undefined) {
    case "invalid_api_key":
      return "This is an invalid Gemini API key.";
    case "rate_limited":
      return "Gemini rate limits are being hit right now. Try again in a moment.";
    case "quota_exceeded":
      return "This Gemini key has exhausted its current quota.";
    case "service_unavailable":
      return "Gemini is temporarily unavailable. Try again shortly.";
    case "deadline_exceeded":
      return "Gemini took too long to respond. Try again.";
    case "network_error":
      return "The Gemini service could not be reached. Check the connection and try again.";
    case "provider_internal_error":
      return "Gemini returned a temporary server error. Try again shortly.";
    case "provider_error":
      return "Gemini returned an unexpected error. Try again.";
    default:
      return "The Gemini key could not be checked right now.";
  }
};

export const getGeminiClientErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return getGeminiValidationErrorMessage();
  }

  const message = error.message.toLowerCase();

  if (
    error.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
  ) {
    return getGeminiValidationErrorMessage("network_error");
  }

  return error.message || getGeminiValidationErrorMessage();
};
