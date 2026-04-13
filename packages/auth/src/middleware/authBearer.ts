import type { Middleware } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthBearerOptions } from "../shared/index.js";
import { buildAuthError } from "../shared/index.js";
import { mergeHeaders } from "./common.js";

const MAX_BEARER_TOKEN_LENGTH = 8192;

function hasUnsafeHeaderChars(token: string): boolean {
  return /[\r\n\0]/u.test(token);
}

export function authBearer(options: AuthBearerOptions): Middleware {
  const headerName = options.header ?? "Authorization";
  const formatValue = options.formatValue ?? ((token: string) => `Bearer ${token}`);

  const middleware: Middleware = async (req, next) => {
    const token = await options.getToken(req);
    if (!token || !token.trim()) {
      throw buildAuthError("PUREQ_AUTH_MISSING_TOKEN", "pureq: no authentication token available");
    }
    if (token.length > MAX_BEARER_TOKEN_LENGTH || hasUnsafeHeaderChars(token)) {
      throw buildAuthError("PUREQ_AUTH_INVALID_TOKEN", "pureq: authentication token contains unsafe header value");
    }
    if (options.validate && !(await options.validate(token))) {
      throw buildAuthError("PUREQ_AUTH_INVALID_TOKEN", "pureq: authentication token validation failed");
    }

    return next(mergeHeaders(req, { [headerName]: formatValue(token) }));
  };

  return markPolicyMiddleware(middleware, { name: "authBearer", kind: "auth" });
}
