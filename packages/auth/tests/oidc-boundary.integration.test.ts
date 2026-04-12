import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOIDCflow,
  createOIDCflowFromProvider,
  parseOIDCCallbackParams,
} from "../src/oidc";
import type { OIDCProviderDefinition } from "../src/shared";

describe("oidc boundary integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns PUREQ_OIDC_DISCOVERY_FAILED when discovery endpoint is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 503 })
    );

    const flow = createOIDCflow({
      clientId: "client-a",
      discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
      redirectUri: "https://app.example.com/callback",
    });

    await expect(flow.getAuthorizationUrl({ state: "s1" })).rejects.toMatchObject({
      code: "PUREQ_OIDC_DISCOVERY_FAILED",
    });
  });

  it("returns PUREQ_OIDC_TOKEN_EXCHANGE_FAILED when token endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes(".well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            authorization_endpoint: "https://issuer.example.com/authorize",
            token_endpoint: "https://issuer.example.com/token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/token") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 404 });
    });

    const flow = createOIDCflow({
      clientId: "client-a",
      discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
      redirectUri: "https://app.example.com/callback",
    });

    await expect(flow.exchangeCode("code-1", { codeVerifier: "v1" })).rejects.toMatchObject({
      code: "PUREQ_OIDC_TOKEN_EXCHANGE_FAILED",
    });
  });

  it("returns PUREQ_OIDC_STATE_MISMATCH when callback state does not match", () => {
    expect(() => parseOIDCCallbackParams("?code=abc&state=s2", "s1")).toThrow(
      /state mismatch/
    );

    try {
      parseOIDCCallbackParams("?code=abc&state=s2", "s1");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("PUREQ_OIDC_STATE_MISMATCH");
    }
  });

  it("applies provider defaults and allows successful callback exchange", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes(".well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            authorization_endpoint: "https://issuer.example.com/authorize",
            token_endpoint: "https://issuer.example.com/token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/token") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            access_token: "access-ok",
            refresh_token: "refresh-ok",
            token_type: "Bearer",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(null, { status: 404 });
    });

    const provider: OIDCProviderDefinition = {
      name: "integration-provider",
      discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
      defaultScope: ["openid", "profile"],
      authorizationDefaults: {
        audience: "api://integration",
      },
    };

    const flow = createOIDCflowFromProvider(provider, {
      clientId: "client-a",
      redirectUri: "https://app.example.com/callback",
    });

    const auth = await flow.getAuthorizationUrl({ state: "state-1" });
    const parsed = new URL(auth.url);
    expect(parsed.searchParams.get("audience")).toBe("api://integration");

    const callbackState = parsed.searchParams.get("state") ?? "";
    const token = await flow.exchangeCallback(
      `https://app.example.com/callback?code=code-1&state=${callbackState}`,
      {
        expectedState: callbackState,
        codeVerifier: auth.codeVerifier,
        expectedNonce: auth.nonce,
      }
    );

    expect(token.accessToken).toBe("access-ok");
    expect(token.refreshToken).toBe("refresh-ok");
  });
});
