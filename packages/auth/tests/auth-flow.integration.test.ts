import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpResponse } from "@pureq/pureq";
import type { RequestConfig } from "@pureq/pureq";
import { authBearer, authSession } from "../src/middleware";
import { createOIDCflowFromProvider, parseOIDCCallbackParams } from "../src/oidc";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";
import type { OIDCProviderDefinition } from "../src/shared";

function createUnsignedJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("auth integration flows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes session and injects bearer token before request", async () => {
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:integration:session",
    });

    const expired = createUnsignedJwt(Math.floor(Date.now() / 1000) - 30);
    const fresh = createUnsignedJwt(Math.floor(Date.now() / 1000) + 3600);
    await session.setTokens({ accessToken: expired, refreshToken: "refresh-a" });

    const refresh = vi.fn(async () => ({
      accessToken: fresh,
      refreshToken: "refresh-b",
    }));

    const sessionMw = authSession({
      session,
      refresh,
      refreshThresholdMs: 60_000,
    });

    const bearerMw = authBearer({
      getToken: async () => (await session.getState()).accessToken,
    });

    const req: RequestConfig = {
      method: "GET",
      url: "https://api.example.com/me",
    };

    const response = await sessionMw(req, (r) =>
      bearerMw(r, async (finalReq) => {
        expect(finalReq.headers?.Authorization).toBe(`Bearer ${fresh}`);
        return new HttpResponse(new Response(null, { status: 200 }));
      })
    );

    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((await session.getState()).refreshToken).toBe("refresh-b");
  });

  it("creates authorization URL from provider and exchanges callback code", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
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
    const parsedAuthUrl = new URL(auth.url);
    expect(parsedAuthUrl.searchParams.get("audience")).toBe("api://integration");

    const state = parsedAuthUrl.searchParams.get("state") ?? "";
    const callbackUrl = `https://app.example.com/callback?code=code-1&state=${state}`;
    const callback = parseOIDCCallbackParams(callbackUrl, state);
    expect(callback.code).toBe("code-1");

    const tokenResponse = await flow.exchangeCallback(callbackUrl, {
      expectedState: state,
      codeVerifier: auth.codeVerifier,
      expectedNonce: auth.nonce,
    });

    expect(tokenResponse.accessToken).toBe("new-access-token");
    expect(tokenResponse.refreshToken).toBe("new-refresh-token");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("propagates logout across managers via broadcast channel", async () => {
    const channelName = "pureq:test:integration:logout";
    const storeA = authMemoryStore();
    const storeB = authMemoryStore();
    const sharedSecret = "integration-broadcast-secret";
    const managerA = createAuthSessionManager(storeA, {
      broadcastChannel: channelName,
      instanceId: "a",
      broadcastSecret: sharedSecret,
    });
    const managerB = createAuthSessionManager(storeB, {
      broadcastChannel: channelName,
      instanceId: "b",
      broadcastSecret: sharedSecret,
    });

    await managerA.setTokens({ accessToken: "token-a", refreshToken: "refresh-a" });
    await managerB.setTokens({ accessToken: "token-b", refreshToken: "refresh-b" });

    await managerA.logout("security");

    await new Promise((resolve) => setTimeout(resolve, 20));
    const stateB = await managerB.getState();
    expect(stateB.accessToken).toBeNull();
    expect(stateB.refreshToken).toBeNull();

    managerA.dispose();
    managerB.dispose();
  });

  it("supports clear-refresh-token rotation policy", async () => {
    const store = authMemoryStore();
    const manager = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:integration:rotation-policy",
      rotationPolicy: "clear-refresh-token",
    });

    const fresh = createUnsignedJwt(Math.floor(Date.now() / 1000) + 3600);
    await manager.setTokens({ accessToken: fresh, refreshToken: "refresh-a" });

    const state = await manager.rotateTokens({ accessToken: fresh }, "clear-refresh-token");
    expect(state.refreshToken).toBeNull();

    manager.dispose();
  });

  it("throws when using manager after dispose", async () => {
    const manager = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:integration:dispose",
    });
    manager.dispose();

    await expect(manager.getState()).rejects.toThrow("disposed");
  });
});
