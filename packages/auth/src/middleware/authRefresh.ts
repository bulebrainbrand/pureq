import type { Middleware, RequestConfig } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthRefreshOptions } from "../shared/index.js";
import { buildAuthError } from "../shared/index.js";
import { mergeHeaders } from "./common.js";

function readHeader(headers: RequestConfig["headers"], name: string): string | null {
  if (!headers) {
    return null;
  }

  const normalized = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalized) {
      return typeof value === "string" ? value : null;
    }
  }

  return null;
}

export function authRefresh(options: AuthRefreshOptions): Middleware {
  const triggerStatus = options.triggerStatus ?? 401;
  const maxAttempts = options.maxAttempts ?? 1;
  const updateRequest =
    options.updateRequest ??
    ((req: RequestConfig, newToken: string) => mergeHeaders(req, { Authorization: `Bearer ${newToken}` }));
  const getRefreshScopeKey =
    options.getRefreshScopeKey ??
    ((req: Readonly<RequestConfig>) => readHeader(req.headers, "authorization") ?? "__global_refresh_scope__");
  const refreshByScope = new Map<string, Promise<string>>();

  const getOrStartRefresh = (req: Readonly<RequestConfig>): Promise<string> => {
    const scopeKey = getRefreshScopeKey(req) || "__global_refresh_scope__";
    const existing = refreshByScope.get(scopeKey);
    if (existing) {
      return existing;
    }

    const refreshPromise = options
      .refresh(req)
      .then(async (newToken) => {
        await options.onSuccess?.(newToken);
        return newToken;
      })
      .catch(async (error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        await options.onFailure?.(normalized);
        throw normalized;
      })
      .finally(() => {
        refreshByScope.delete(scopeKey);
      });

    refreshByScope.set(scopeKey, refreshPromise);
    return refreshPromise;
  };

  const middleware: Middleware = async (req, next) => {
    let attempts = 0;
    let currentReq = req;

    while (attempts <= maxAttempts) {
      const response = await next(currentReq);
      if (response.status !== triggerStatus || attempts >= maxAttempts) {
        return response;
      }

      attempts += 1;

      try {
        const newToken = await getOrStartRefresh(currentReq);
        currentReq = updateRequest(currentReq, newToken);
      } catch (error) {
        throw buildAuthError("PUREQ_AUTH_REFRESH_FAILED", "pureq: token refresh failed", error);
      }
    }

    throw buildAuthError("PUREQ_AUTH_UNAUTHORIZED", "pureq: authentication refresh loop exited unexpectedly");
  };

  return markPolicyMiddleware(middleware, { name: "authRefresh", kind: "auth" });
}
