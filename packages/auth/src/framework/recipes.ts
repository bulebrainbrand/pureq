import type {
  AuthFrameworkContext,
  AuthMappedHttpError,
  AuthRouteHandlerRecipe,
  AuthRouteHandlerRecipeOptions,
  AuthServerActionRecipe,
  AuthServerActionResult,
} from "../shared";

function isErrorWithCode(value: unknown): value is { readonly code: string; readonly message?: string } {
  return typeof value === "object" && value !== null && typeof (value as { readonly code?: unknown }).code === "string";
}

/** SEC-M6: Generic user-facing messages for production. */
const SANITIZED_MESSAGES: Readonly<Record<string, string>> = {
  PUREQ_AUTH_MISSING_TOKEN: "Authentication required",
  PUREQ_AUTH_UNAUTHORIZED: "Authentication required",
  PUREQ_AUTH_EXPIRED: "Session expired",
  PUREQ_AUTH_INVALID_TOKEN: "Invalid credentials",
  PUREQ_AUTH_REFRESH_FAILED: "Session expired",
  PUREQ_AUTH_CSRF_INVALID: "Request validation failed",
  PUREQ_AUTH_CSRF_FAILED: "Request validation failed",
  PUREQ_AUTH_CSRF_INVALID_TOKEN: "Request validation failed",
  PUREQ_AUTH_REVOKED: "Session has been revoked",
  PUREQ_AUTH_INVALID_CREDENTIALS: "Invalid credentials",
};

export function mapAuthErrorToHttp(error: unknown, sanitize = false): AuthMappedHttpError {
  if (!isErrorWithCode(error)) {
    const message = sanitize ? "Internal server error" : (error instanceof Error ? error.message : "internal auth error");
    return {
      status: 500,
      message,
    };
  }

  const code = error.code;
  const rawMessage =
    typeof error.message === "string" && error.message.trim() ? error.message : "auth error";
  const message = sanitize ? (SANITIZED_MESSAGES[code] ?? "Authentication error") : rawMessage;

  if (code === "PUREQ_AUTH_MISSING_TOKEN" || code === "PUREQ_AUTH_UNAUTHORIZED") {
    return { status: 401, code, message };
  }

  if (code === "PUREQ_AUTH_EXPIRED" || code === "PUREQ_AUTH_INVALID_TOKEN") {
    return { status: 401, code, message };
  }

  if (code === "PUREQ_AUTH_REFRESH_FAILED") {
    return { status: 401, code, message };
  }

  if (
    code === "PUREQ_AUTH_CSRF_INVALID" ||
    code === "PUREQ_AUTH_CSRF_FAILED" ||
    code === "PUREQ_AUTH_CSRF_INVALID_TOKEN"
  ) {
    return { status: 403, code, message };
  }

  if (code === "PUREQ_AUTH_REVOKED") {
    return { status: 401, code, message };
  }

  if (code.startsWith("PUREQ_OIDC_")) {
    return { status: 400, code, message };
  }

  return { status: 500, code, message };
}

export function createAuthRouteHandlerRecipe(
  context: AuthFrameworkContext,
  recipeOptions: AuthRouteHandlerRecipeOptions = {}
): AuthRouteHandlerRecipe {
  const sanitize = recipeOptions.sanitizeErrors ?? true;

  return {
    context,

    ok(body: BodyInit | null = null, init: ResponseInit = {}): Response {
      return new Response(body, context.toResponseInit(init));
    },

    json(value: unknown, init: ResponseInit = {}): Response {
      const headers = new Headers(init.headers);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
      }
      return new Response(JSON.stringify(value), context.toResponseInit({ ...init, headers }));
    },

    error(error: unknown, init: ResponseInit = {}): Response {
      const mapped = mapAuthErrorToHttp(error, sanitize);
      const headers = new Headers(init.headers);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
      }

      return new Response(
        JSON.stringify({
          error: {
            code: mapped.code,
            message: mapped.message,
          },
        }),
        context.toResponseInit({
          ...init,
          status: init.status ?? mapped.status,
          headers,
        })
      );
    },
  };
}

export function createAuthServerActionRecipe(context: AuthFrameworkContext): AuthServerActionRecipe {
  return {
    context,

    async run<T>(action: () => Promise<T> | T): Promise<AuthServerActionResult<T>> {
      try {
        const data = await action();
        return {
          ok: true,
          data,
          transferPayload: context.toSessionTransferPayload(),
          responseInit: context.toResponseInit({ status: 200 }),
        };
      } catch (error) {
        const mapped = mapAuthErrorToHttp(error, true);
        return {
          ok: false,
          error: mapped,
          transferPayload: context.toSessionTransferPayload(),
          responseInit: context.toResponseInit({ status: mapped.status }),
        };
      }
    },
  };
}

export type {
  AuthMappedHttpError,
  AuthRouteHandlerRecipe,
  AuthRouteHandlerRecipeOptions,
  AuthServerActionFailure,
  AuthServerActionRecipe,
  AuthServerActionResult,
  AuthServerActionSuccess,
} from "../shared";
