import type { Middleware, RequestConfig } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthBasicOptions } from "../shared/index.js";
import { base64Encode, resolveStringValue, createAuthError } from "../shared/index.js";
import { mergeHeaders } from "./common.js";

function hasUnsafeChars(value: string): boolean {
  return /[\r\n\0]/u.test(value);
}

/** HTTP Basic authentication middleware. SEC-H4: validates credentials for injection safety. */
export function authBasic(options: AuthBasicOptions): Middleware {
  const headerName = options.header ?? "Authorization";

  const middleware: Middleware = async (req, next) => {
    const username = await resolveStringValue(options.username);
    const password = await resolveStringValue(options.password);

    // SEC-H4: Reject username containing ':' and unsafe header chars
    if (username.includes(":")) {
      throw createAuthError("PUREQ_AUTH_INVALID_CREDENTIALS", "pureq: Basic auth username must not contain ':'");
    }
    if (hasUnsafeChars(username) || hasUnsafeChars(password)) {
      throw createAuthError("PUREQ_AUTH_INVALID_CREDENTIALS", "pureq: Basic auth credentials contain unsafe characters");
    }

    const encoded = base64Encode(`${username}:${password}`);

    return next(mergeHeaders(req, { [headerName]: `Basic ${encoded}` }));
  };

  return markPolicyMiddleware(middleware, { name: "authBasic", kind: "auth" });
}
