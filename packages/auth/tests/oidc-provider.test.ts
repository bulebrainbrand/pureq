import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOIDCflowFromProvider,
  oidcProviders,
  parseOIDCCallbackParams,
} from "../src/oidc";
import type { OIDCProviderDefinition } from "../src/shared";

describe("OIDC provider flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses callback params and validates state", () => {
    const parsed = parseOIDCCallbackParams("?code=abc123&state=s1", "s1");
    expect(parsed.code).toBe("abc123");
    expect(parsed.state).toBe("s1");

    expect(() => parseOIDCCallbackParams("?code=abc123&state=s2", "s1")).toThrow("state mismatch");
  });

  it("classifies callback parsing failures with auth error codes", () => {
    expect(() => parseOIDCCallbackParams("?error=access_denied&error_description=denied")).toThrow(
      /OIDC callback error/
    );

    try {
      parseOIDCCallbackParams("?error=access_denied&error_description=denied");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("PUREQ_OIDC_CALLBACK_ERROR");
    }

    try {
      parseOIDCCallbackParams("?state=s1", "s1");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("PUREQ_OIDC_MISSING_CODE");
    }
  });

  it("merges provider authorization defaults into extra params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authorization_endpoint: "https://issuer.example.com/authorize",
          token_endpoint: "https://issuer.example.com/token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const provider: OIDCProviderDefinition = {
      name: "test-provider",
      discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
      authorizationDefaults: {
        audience: "api://default",
      },
    };

    const flow = createOIDCflowFromProvider(provider, {
      clientId: "client-a",
      redirectUri: "https://app.example.com/callback",
    });

    const auth = await flow.getAuthorizationUrl({
      codeChallenge: "plain-challenge",
      codeChallengeMethod: "plain",
      extraParams: {
        prompt: "consent",
      },
    });

    const parsed = new URL(auth.url);
    expect(parsed.searchParams.get("audience")).toBe("api://default");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid provider configuration early", () => {
    expect(() =>
      createOIDCflowFromProvider(
        {
          name: "",
          discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
        },
        {
          clientId: "client-a",
          redirectUri: "https://app.example.com/callback",
        }
      )
    ).toThrow("provider name is required");

    expect(() => oidcProviders.auth0("   ")).toThrow("auth0 domain is required");
  });

  it("applies provider validation callback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authorization_endpoint: "https://issuer.example.com/authorize",
          token_endpoint: "https://issuer.example.com/token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const flow = createOIDCflowFromProvider(oidcProviders.auth0("tenant.example.com"), {
      clientId: "client-a",
      redirectUri: "https://app.example.com/callback",
    });

    await expect(
      flow.getAuthorizationUrl({
        codeChallenge: "plain-challenge",
        codeChallengeMethod: "plain",
      })
    ).rejects.toThrow("requires S256");
  });

  it("rejects token responses missing access_token with structured error code", async () => {
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
        return new Response(JSON.stringify({ refresh_token: "only-refresh" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 404 });
    });

    const flow = createOIDCflowFromProvider(
      {
        name: "structured-provider",
        discoveryUrl: "https://issuer.example.com/.well-known/openid-configuration",
      },
      {
        clientId: "client-a",
        redirectUri: "https://app.example.com/callback",
      }
    );

    await expect(flow.exchangeCode("code-1", { codeVerifier: "verifier-1" })).rejects.toMatchObject({
      code: "PUREQ_OIDC_INVALID_TOKEN_RESPONSE",
    });
  });
});
