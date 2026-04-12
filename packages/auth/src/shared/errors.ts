export interface AuthErrorOptions {
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, string | number | boolean | null | undefined>>;
}

export interface AuthError extends Error {
  readonly code: string;
  readonly kind: "auth-error";
  readonly details?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly cause?: unknown;
}

export function createAuthError(code: string, message: string, options: AuthErrorOptions = {}): AuthError {
  return Object.assign(new Error(message), {
    code,
    kind: "auth-error" as const,
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
    ...(options.details !== undefined ? { details: options.details } : {}),
  }) as AuthError;
}

export function buildAuthError(code: string, message: string, cause?: unknown): AuthError {
  return createAuthError(code, message, cause !== undefined ? { cause } : {});
}
