import { describe, expect, it, vi } from "vitest";
import type { Middleware, RequestConfig } from "@pureq/pureq";
import { authBearer, authRefresh, authSession } from "../src/middleware";
import { createAuthSessionManager } from "../src/session";
import { authMemoryStore } from "../src/storage";

function createUnsignedJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.`;
}

function compose(...middlewares: readonly Middleware[]): Middleware {
  return async (req, next) => {
    const dispatch = async (index: number, currentReq: RequestConfig): Promise<Response> => {
      if (index >= middlewares.length) {
        return next(currentReq);
      }
      return middlewares[index](currentReq, (nextReq) => dispatch(index + 1, nextReq));
    };

    return dispatch(0, req);
  };
}

describe("middleware contract integration", () => {
  it("preserves expected composition order: authSession -> authBearer -> authRefresh", async () => {
    const order: string[] = [];
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:middleware-order",
      instanceId: "middleware-order",
    });

    const expired = createUnsignedJwt(Math.floor(Date.now() / 1000) - 30);
    const fresh = createUnsignedJwt(Math.floor(Date.now() / 1000) + 3600);
    await session.setTokens({ accessToken: expired, refreshToken: "refresh-a" });

    const refreshSession = vi.fn(async () => {
      order.push("session.refresh");
      return {
        accessToken: fresh,
        refreshToken: "refresh-b",
      };
    });

    const sessionMw = authSession({
      session,
      refresh: refreshSession,
      refreshThresholdMs: 60_000,
      onRefreshed: () => {
        order.push("session.onRefreshed");
      },
    });

    const bearerMw = authBearer({
      getToken: async () => {
        order.push("bearer.getToken");
        const state = await session.getState();
        return state.accessToken;
      },
    });

    const refreshMw = authRefresh({
      triggerStatus: 401,
      refresh: async () => {
        order.push("refresh.middleware.refresh");
        return "api-refreshed-token";
      },
      onSuccess: async () => {
        order.push("refresh.middleware.onSuccess");
      },
    });

    let callCount = 0;
    const pipeline = compose(sessionMw, bearerMw, refreshMw);
    const response = await pipeline(
      {
        method: "GET",
        url: "https://api.example.com/me",
      },
      async (finalReq) => {
        callCount += 1;
        order.push(`next.call.${callCount}`);

        if (callCount === 1) {
          expect(finalReq.headers?.Authorization).toBe(`Bearer ${fresh}`);
          return new Response(null, { status: 401 });
        }

        expect(finalReq.headers?.Authorization).toBe("Bearer api-refreshed-token");
        return new Response(null, { status: 200 });
      }
    );

    expect(response.status).toBe(200);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(order).toContain("session.refresh");
    expect(order).toContain("bearer.getToken");
    expect(order).toContain("refresh.middleware.refresh");

    const next1 = order.indexOf("next.call.1");
    const next2 = order.indexOf("next.call.2");
    expect(next1).toBeGreaterThan(-1);
    expect(next2).toBeGreaterThan(next1);

    session.dispose();
  });

  it("emits PUREQ_AUTH_REFRESH_FAILED and invokes onFailure when refresh middleware fails", async () => {
    const onFailure = vi.fn();
    const refreshMw = authRefresh({
      triggerStatus: 401,
      refresh: async () => {
        throw new Error("refresh endpoint down");
      },
      onFailure,
    });

    await expect(
      refreshMw(
        {
          method: "GET",
          url: "https://api.example.com/me",
          headers: { Authorization: "Bearer token-a" },
        },
        async () => new Response(null, { status: 401 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_REFRESH_FAILED" });

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0]?.[0]?.message).toContain("refresh endpoint down");
  });

  it("emits PUREQ_AUTH_REFRESH_FAILED and invokes onRefreshError when session refresh fails", async () => {
    const store = authMemoryStore();
    const session = createAuthSessionManager(store, {
      broadcastChannel: "pureq:test:session-refresh-failure",
      instanceId: "session-refresh-failure",
    });

    const expired = createUnsignedJwt(Math.floor(Date.now() / 1000) - 30);
    await session.setTokens({ accessToken: expired, refreshToken: "refresh-a" });

    const onRefreshError = vi.fn();
    const sessionMw = authSession({
      session,
      refresh: async () => {
        throw new Error("session refresh failed");
      },
      refreshThresholdMs: 60_000,
      onRefreshError,
    });

    await expect(
      sessionMw(
        {
          method: "GET",
          url: "https://api.example.com/me",
        },
        async () => new Response(null, { status: 200 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_REFRESH_FAILED" });

    expect(onRefreshError).toHaveBeenCalledTimes(1);
    expect(onRefreshError.mock.calls[0]?.[0]?.message).toContain("session refresh failed");

    session.dispose();
  });

  it("deduplicates concurrent authRefresh calls inside one middleware instance", async () => {
    const deferred = (() => {
      let resolve!: (value: string) => void;
      const promise = new Promise<string>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    })();

    const refresh = vi.fn(() => deferred.promise);
    const refreshMw = authRefresh({
      triggerStatus: 401,
      refresh,
    });

    let callCount = 0;
    const next = vi.fn(async (req: RequestConfig) => {
      callCount += 1;
      if (callCount <= 2) {
        return new Response(null, { status: 401 });
      }

      expect(req.headers?.Authorization).toBe("Bearer refreshed-token");
      return new Response(null, { status: 200 });
    });

    const request: RequestConfig = {
      method: "GET",
      url: "https://api.example.com/me",
      headers: { Authorization: "Bearer stale-token" },
    };

    const first = refreshMw(request, next);
    const second = refreshMw(request, next);

    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);

    deferred.resolve("refreshed-token");

    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(4);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
