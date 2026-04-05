type GeminiErrorCode =
  | "invalid_api_key"
  | "rate_limited"
  | "quota_exceeded"
  | "service_unavailable"
  | "deadline_exceeded"
  | "network_error"
  | "provider_internal_error"
  | "provider_error";

type GeminiErrorLike = {
  status?: number;
  message?: string;
  error?: unknown;
  cause?: unknown;
  code?: unknown;
  stack?: string;
};

const getNestedErrorText = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(getNestedErrorText).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(getNestedErrorText).join(" ");
  }

  return "";
};

const hasMessage = (error: unknown): error is { message?: string } => {
  return typeof error === "object" && error !== null;
};

const hasStatus = (error: unknown): error is { status?: number } => {
  return typeof error === "object" && error !== null;
};

const hasCode = (error: unknown): error is { code?: unknown } => {
  return typeof error === "object" && error !== null;
};

export const getGeminiErrorDebugDetails = (error: unknown) => {
  const errorLike = (error ?? {}) as GeminiErrorLike;

  return {
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : undefined,
    status: hasStatus(error) ? error.status : undefined,
    code: hasCode(error) ? error.code : undefined,
    nestedErrorText: getNestedErrorText(errorLike.error),
    nestedCauseText: getNestedErrorText(errorLike.cause),
    raw: errorLike
  };
};

export const normalizeGeminiError = (error: unknown) => {
  const errorLike = (error ?? {}) as GeminiErrorLike;
  const status = typeof errorLike.status === "number" ? errorLike.status : undefined;
  const rawMessage = hasMessage(error) && typeof error.message === "string"
    ? error.message
    : "";
  const providerErrorText = getNestedErrorText(errorLike.error);
  const providerCauseText = getNestedErrorText(errorLike.cause);
  const codeText = hasCode(error) ? String(error.code ?? "") : "";
  const combinedText = `${rawMessage} ${providerErrorText} ${providerCauseText} ${codeText}`.toLowerCase();

  const looksLikeInvalidKey =
    combinedText.includes("invalid api key") ||
    combinedText.includes("api key not valid") ||
    combinedText.includes("api_key_invalid") ||
    combinedText.includes("authentication") ||
    combinedText.includes("unauthorized") ||
    combinedText.includes("permission denied") ||
    combinedText.includes("bad request sending request") ||
    (combinedText.includes("bad request") && combinedText.includes("api key")) ||
    combinedText.includes("api key expired") ||
    combinedText.includes("credential") ||
    combinedText.includes("invalid argument: api key");

  if (status === 400 && looksLikeInvalidKey) {
    return {
      code: "invalid_api_key" as GeminiErrorCode,
      status: 401
    };
  }

  if (status === 401 || status === 403 || looksLikeInvalidKey) {
    return {
      code: "invalid_api_key" as GeminiErrorCode,
      status: status ?? 401
    };
  }

  if (status === 429) {
    return {
      code: combinedText.includes("quota") || combinedText.includes("resource_exhausted")
        ? ("quota_exceeded" as GeminiErrorCode)
        : ("rate_limited" as GeminiErrorCode),
      status: 429
    };
  }

  if (status === 503) {
    return {
      code: "service_unavailable" as GeminiErrorCode,
      status: 503
    };
  }

  if (
    status === 504 ||
    combinedText.includes("deadline_exceeded") ||
    combinedText.includes("timed out") ||
    combinedText.includes("timeout")
  ) {
    return {
      code: "deadline_exceeded" as GeminiErrorCode,
      status: 504
    };
  }

  if (
    status === undefined &&
    (
      combinedText.includes("network") ||
      combinedText.includes("fetch") ||
      combinedText.includes("connection") ||
      combinedText.includes("socket") ||
      combinedText.includes("econn") ||
      combinedText.includes("enotfound") ||
      combinedText.includes("eai_again")
    )
  ) {
    return {
      code: "network_error" as GeminiErrorCode,
      status: 503
    };
  }

  if (status && status >= 500) {
    return {
      code: "provider_internal_error" as GeminiErrorCode,
      status
    };
  }

  return {
    code: "provider_error" as GeminiErrorCode,
    status: status ?? 500
  };
};

export type { GeminiErrorCode };
