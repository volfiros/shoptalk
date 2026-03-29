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

export const normalizeGeminiError = (error: unknown) => {
  const errorLike = (error ?? {}) as GeminiErrorLike;
  const status = typeof errorLike.status === "number" ? errorLike.status : undefined;
  const rawMessage = hasMessage(error) && typeof error.message === "string"
    ? error.message
    : "";
  const providerErrorText = getNestedErrorText(errorLike.error);
  const combinedText = `${rawMessage} ${providerErrorText}`.toLowerCase();

  if (status === 401 || status === 403) {
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

  if (status === 504 || combinedText.includes("deadline_exceeded")) {
    return {
      code: "deadline_exceeded" as GeminiErrorCode,
      status: 504
    };
  }

  if (status && status >= 500) {
    return {
      code: "provider_internal_error" as GeminiErrorCode,
      status
    };
  }

  if (
    status === undefined &&
    (
      combinedText.includes("network") ||
      combinedText.includes("fetch") ||
      combinedText.includes("connection") ||
      combinedText.includes("timeout")
    )
  ) {
    return {
      code: "network_error" as GeminiErrorCode,
      status: 503
    };
  }

  return {
    code: "provider_error" as GeminiErrorCode,
    status: status ?? 500
  };
};

export type { GeminiErrorCode };
