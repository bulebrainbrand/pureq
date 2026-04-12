import { describe, expect, it, vi } from "vitest";
import type { RequestConfig } from "@pureq/pureq";
import { authBearer } from "../src/middleware";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";
import { createOIDCflow } from "../src/oidc";
import { createAuthCsrfProtection } from "../src/csrf";
import { parseOIDCCallbackParams } from "../src/oidc";

function createUnsignedJwt(expSeconds: number, userId = "test-user"): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds, sub: userId })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("advanced attack simulation", () => {
  it("rejects malformed bearer tokens with header injection characters", async () => {
    const middleware = authBearer({
      getToken: () => "valid-token\r\nX-Injected: 1",
    });

    await expect(
      middleware(
        {
          method: "GET",
          url: "https://api.example.com/protected",
        },
        async () => new Response(null, { status: 200 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_INVALID_TOKEN" });
  });

  it("deduplicates refresh storm under concurrent calls", async () => {
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:advanced:bruteforce",
      instanceId: "advanced-bruteforce",
    });

    const expired = createUnsignedJwt(Math.floor(Date.now() / 1000) - 60);
    const fresh = createUnsignedJwt(Math.floor(Date.now() / 1000) + 3600);
    await session.setTokens({ accessToken: expired, refreshToken: "refresh-1" });

    const refresh = vi.fn(async () => ({
      accessToken: fresh,
      refreshToken: "refresh-2",
    }));

    const attempts = Array.from({ length: 80 }, () => session.refreshIfNeeded(refresh, 60_000));
    const states = await Promise.all(attempts);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(states.every((state) => state.accessToken === fresh)).toBe(true);

    session.dispose();
  });

  it("blocks csrf attacks with missing or mismatched token", async () => {
    const csrf = createAuthCsrfProtection({
      expectedToken: () => "csrf-expected",
      headerName: "x-csrf-token",
      queryParamName: "csrfToken",
    });

    const missingHeaderReq: RequestConfig = {
      method: "POST",
      url: "https://api.example.com/user/change-password",
    };

    const wrongHeaderReq: RequestConfig = {
      method: "POST",
      url: "https://api.example.com/user/change-password",
      headers: {
        "x-csrf-token": "csrf-bad",
      },
    };

    await expect(csrf.verify(missingHeaderReq)).resolves.toBe(false);
    await expect(csrf.verify(wrongHeaderReq)).resolves.toBe(false);
  });

  it("rejects OIDC callback parameter pollution", () => {
    expect(() => parseOIDCCallbackParams("?code=a&code=b&state=s", "s")).toThrow(/duplicated code parameter/);
    expect(() => parseOIDCCallbackParams("?code=a&state=s1&state=s2", "s1")).toThrow(/duplicated state parameter/);
  });

  it("blocks OIDC callback replay in exchangeCallback", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(".well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            authorization_endpoint: "https://issuer.example.com/auth",
            token_endpoint: "https://issuer.example.com/token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: "access-1",
          refresh_token: "refresh-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const flow = createOIDCflow({
        clientId: "test-client",
        discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
        redirectUri: "https://app.example.com/callback",
      });

      const callback = "?code=replay-code-1&state=stable-state";
      await flow.exchangeCallback(callback, { expectedState: "stable-state", codeVerifier: "v" });

      await expect(
        flow.exchangeCallback(callback, { expectedState: "stable-state", codeVerifier: "v" })
      ).rejects.toMatchObject({ code: "PUREQ_OIDC_CALLBACK_REPLAY" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
