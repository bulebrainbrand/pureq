import type { AuthSessionManager, AuthSessionState } from "../shared/index.js";

export interface AuthBridgeRequestLike {
  readonly headers?: Headers | Readonly<Record<string, string | null | undefined>>;
}

export interface AuthBridgeCookieOptions {
  readonly accessTokenCookieName?: string;
  readonly refreshTokenCookieName?: string;
  readonly authorizationHeaderName?: string;
  readonly cookiePath?: string;
  readonly sameSite?: "lax" | "strict" | "none";
  readonly secure?: boolean;
  readonly httpOnly?: boolean;
  readonly domain?: string;
  readonly maxAgeSeconds?: number;
}

export interface AuthBridge {
  readSession(request: AuthBridgeRequestLike): AuthSessionState;
  buildSetCookieHeaders(session: AuthSessionState): readonly string[];
  hydrateSessionManager(session: AuthSessionManager, request: AuthBridgeRequestLike): Promise<AuthSessionState>;
}

const MAX_COOKIE_HEADER_LENGTH = 16 * 1024;
const MAX_COOKIE_SEGMENTS = 256;
const DEFAULT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function readHeaderValue(
  headers: AuthBridgeRequestLike["headers"],
  name: string
): string | null {
  if (!headers) {
    return null;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase());
  }

  const normalized = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalized) {
      return value ?? null;
    }
  }

  return null;
}

function parseCookieHeader(cookieHeader: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};

  if (cookieHeader.length > MAX_COOKIE_HEADER_LENGTH) {
    return result;
  }

  let segmentCount = 0;

  for (const segment of cookieHeader.split(";")) {
    segmentCount += 1;
    if (segmentCount > MAX_COOKIE_SEGMENTS) {
      break;
    }

    const [rawName, ...rawValueParts] = segment.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    const name = rawName.trim();
    const value = rawValueParts.join("=").trim();
    if (name) {
      try {
        result[decodeURIComponent(name)] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }
    }
  }

  return result;
}

function parseBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/iu.exec(headerValue.trim());
  return match?.[1]?.trim() || null;
}

function createCookieHeader(
  name: string,
  value: string | null,
  options: {
    readonly cookiePath: string;
    readonly sameSite: string;
    readonly secure: boolean;
    readonly httpOnly: boolean;
    readonly domain?: string;
    readonly maxAgeSeconds?: number;
  }
): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value ?? "")}`, `Path=${options.cookiePath}`, `SameSite=${options.sameSite}`];

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  // SEC-C4: HttpOnly by default
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (value === null) {
    parts.push("Max-Age=0");
  } else if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  return parts.join("; ");
}

/** Create an SSR/BFF bridge for reading sessions from requests and building Set-Cookie response headers. */
export function createAuthBridge(options: AuthBridgeCookieOptions = {}): AuthBridge {
  const accessTokenCookieName = options.accessTokenCookieName ?? "pureq_access_token";
  const refreshTokenCookieName = options.refreshTokenCookieName ?? "pureq_refresh_token";
  const authorizationHeaderName = options.authorizationHeaderName ?? "authorization";
  const cookiePath = options.cookiePath ?? "/";
  const sameSite = options.sameSite ?? "lax";
  const secure = options.secure ?? true;
  const httpOnly = options.httpOnly ?? true;

  const readSession = (request: AuthBridgeRequestLike): AuthSessionState => {
    const cookieHeader = readHeaderValue(request.headers, "cookie");
    const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
    const accessTokenFromCookie = cookies[accessTokenCookieName] ?? null;
    const refreshTokenFromCookie = cookies[refreshTokenCookieName] ?? null;
    const bearerToken = parseBearerToken(readHeaderValue(request.headers, authorizationHeaderName));

    return {
      accessToken: accessTokenFromCookie ?? bearerToken,
      refreshToken: refreshTokenFromCookie,
    };
  };

  return {
    readSession,
    buildSetCookieHeaders(session: AuthSessionState): readonly string[] {
      const cookieOptions = {
        cookiePath,
        sameSite,
        secure,
        httpOnly,
        ...(options.domain !== undefined ? { domain: options.domain } : {}),
        maxAgeSeconds: options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS,
      };

      return [
        createCookieHeader(accessTokenCookieName, session.accessToken, cookieOptions),
        createCookieHeader(refreshTokenCookieName, session.refreshToken, cookieOptions),
      ];
    },
    async hydrateSessionManager(session: AuthSessionManager, request: AuthBridgeRequestLike): Promise<AuthSessionState> {
      const snapshot = readSession(request);
      if (!snapshot.accessToken) {
        await session.clear();
        return snapshot;
      }

      await session.setTokens({
        accessToken: snapshot.accessToken,
        ...(snapshot.refreshToken ? { refreshToken: snapshot.refreshToken } : {}),
      });

      return snapshot;
    },
  };
}
