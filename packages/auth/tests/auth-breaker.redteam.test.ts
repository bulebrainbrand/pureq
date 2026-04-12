import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@pureq/pureq";
import { authBearer, authRefresh } from "../src/middleware";
import { createOIDCflow } from "../src/oidc";

describe("redteam breaker: try to break pureq auth without prior mitigation", () => {
  it("cross-request refresh confusion is isolated by refresh scope", async () => {
    let refreshCalls = 0;
    const middleware = authRefresh({
      triggerStatus: 401,
      refresh: async (req) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        refreshCalls += 1;
        const stale = req.headers?.Authorization;
        if (stale === "Bearer stale-user-a") {
          return "token-user-a";
        }
        return "token-user-b";
      },
    });

    const retriedAuthByUrl = new Map<string, string | undefined>();

    const next = async (req: RequestConfig): Promise<Response> => {
      const auth = req.headers?.Authorization;
      if (auth === "Bearer stale-user-a" || auth === "Bearer stale-user-b") {
        return new Response(null, { status: 401 });
      }

      retriedAuthByUrl.set(req.url, auth);
      return new Response(null, { status: 200 });
    };

    const userAReq: RequestConfig = {
      method: "GET",
      url: "https://api.example.com/user-a/profile",
      headers: {
        Authorization: "Bearer stale-user-a",
      },
    };

    const userBReq: RequestConfig = {
      method: "GET",
      url: "https://api.example.com/user-b/profile",
      headers: {
        Authorization: "Bearer stale-user-b",
      },
    };

    const [a, b] = await Promise.all([middleware(userAReq, next), middleware(userBReq, next)]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const userARetryAuth = retriedAuthByUrl.get(userAReq.url);
    const userBRetryAuth = retriedAuthByUrl.get(userBReq.url);

    expect(userARetryAuth).toBe("Bearer token-user-a");
    expect(userBRetryAuth).toBe("Bearer token-user-b");
    expect(refreshCalls).toBe(2);
  });

  it("bearer whitespace token injection is blocked", async () => {
    const middleware = authBearer({
      getToken: () => "   ",
    });

    await expect(
      middleware(
        {
          method: "GET",
          url: "https://api.example.com/resource",
        },
        async () => new Response(null, { status: 200 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_MISSING_TOKEN" });
  });

  it("OIDC callback replay is blocked during exchangeCallback", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
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

      return new Response(JSON.stringify({ access_token: "access-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const flow = createOIDCflow({
        clientId: "client-a",
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
