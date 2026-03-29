export const GEMINI_API_KEY_STORAGE_KEY = "shopping-assistant.gemini-api-key";

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
  return error === "invalid_api_key"
    ? "The Gemini key could not be validated."
    : "The Gemini key could not be checked right now.";
};
