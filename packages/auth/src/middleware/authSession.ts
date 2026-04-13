import type { Middleware, RequestConfig } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthSessionMiddlewareOptions, AuthSessionState } from "../shared/index.js";
import { buildAuthError } from "../shared/index.js";
import { mergeHeaders } from "./common.js";

async function ensureAuthState(options: AuthSessionMiddlewareOptions): Promise<AuthSessionState> {
  try {
    return await options.session.refreshIfNeeded(options.refresh, options.refreshThresholdMs ?? 60_000);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    await options.onRefreshError?.(normalized);
    throw buildAuthError("PUREQ_AUTH_REFRESH_FAILED", "pureq: failed to refresh session token", error);
  }
}

/** Session middleware — refreshes tokens as needed and injects the access token into the request (DX-L2). */
export function authSession(options: AuthSessionMiddlewareOptions): Middleware {
  const middleware: Middleware = async (req, next) => {
    const before = await options.session.getState();
    const state = await ensureAuthState(options);

    const refreshed = before.accessToken !== state.accessToken;
    if (refreshed) {
      await options.onRefreshed?.(state);
    }

    if ((options.requireAccessToken ?? true) && !state.accessToken) {
      throw buildAuthError("PUREQ_AUTH_MISSING_TOKEN", "pureq: no active session access token");
    }

    // DX-L2: Inject the current access token into the request
    let nextReq = req;
    if (state.accessToken) {
      nextReq = mergeHeaders(req, { Authorization: `Bearer ${state.accessToken}` });
    }

    return next(nextReq);
  };

  return markPolicyMiddleware(middleware, { name: "authSession", kind: "auth" });
}