export interface ProviderNormalizedError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly retriable: boolean;
}

export const PROVIDER_ERROR_NORMALIZATION_TABLE: Readonly<Record<string, ProviderNormalizedError>> = {
  PUREQ_OIDC_CALLBACK_ERROR: {
    code: "PUREQ_OIDC_CALLBACK_ERROR",
    message: "OIDC callback failed",
    status: 400,
    retriable: false,
  },
  PUREQ_OIDC_STATE_MISMATCH: {
    code: "PUREQ_OIDC_STATE_MISMATCH",
    message: "Invalid callback state",
    status: 400,
    retriable: false,
  },
  PUREQ_OIDC_MISSING_CODE: {
    code: "PUREQ_OIDC_MISSING_CODE",
    message: "Missing authorization code",
    status: 400,
    retriable: false,
  },
  PUREQ_OIDC_TOKEN_EXCHANGE_FAILED: {
    code: "PUREQ_OIDC_TOKEN_EXCHANGE_FAILED",
    message: "Provider token exchange failed",
    status: 502,
    retriable: true,
  },
  PUREQ_OIDC_TOKEN_REFRESH_FAILED: {
    code: "PUREQ_OIDC_TOKEN_REFRESH_FAILED",
    message: "Provider token refresh failed",
    status: 502,
    retriable: true,
  },
  PUREQ_OIDC_INVALID_TOKEN_RESPONSE: {
    code: "PUREQ_OIDC_INVALID_TOKEN_RESPONSE",
    message: "Provider returned invalid token response",
    status: 502,
    retriable: false,
  },
  PUREQ_AUTH_INVALID_PROVIDER: {
    code: "PUREQ_AUTH_INVALID_PROVIDER",
    message: "Unsupported provider configuration",
    status: 400,
    retriable: false,
  },
  PUREQ_AUTH_UNAUTHORIZED: {
    code: "PUREQ_AUTH_UNAUTHORIZED",
    message: "Provider authentication denied",
    status: 401,
    retriable: false,
  },
};

export function normalizeProviderError(error: unknown): ProviderNormalizedError {
  const code =
    error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "PUREQ_PROVIDER_UNKNOWN";

  const known = PROVIDER_ERROR_NORMALIZATION_TABLE[code];
  if (known) {
    return known;
  }

  return {
    code,
    message: "Provider operation failed",
    status: 500,
    retriable: false,
  };
}
