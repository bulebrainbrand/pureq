import { describe, expect, it } from "vitest";
import { withCsrfProtection } from "../src/csrf";
import { createAuthRevocationRegistry, withRevocationGuard } from "../src/revocation";
import { createAuthSessionManager } from "../src/session";
import { createAuthEventAdapter } from "../src/events";
import { authMemoryStore } from "../src/storage";
import type { Middleware, RequestConfig } from "@pureq/pureq";

function compose(a: Middleware, b: Middleware): Middleware {
  return (req, next) => a(req, (nextReq) => b(nextReq, next));
}

describe("security contract integration", () => {
  it("allows safe method without csrf token", async () => {
    const csrf = withCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    const response = await csrf(
      {
        method: "GET",
        url: "https://api.example.com/me",
      },
      async () => new Response(null, { status: 204 })
    );

    expect(response.status).toBe(204);
  });

  it("blocks unsafe method when csrf token is missing", async () => {
    const csrf = withCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    await expect(
      csrf(
        {
          method: "POST",
          url: "https://api.example.com/transfer",
        },
        async () => new Response(null, { status: 204 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_CSRF_FAILED" });
  });

  it("blocks revoked session even when csrf is valid", async () => {
    const revocation = createAuthRevocationRegistry();
    revocation.revokeSession("sid-1");

    const csrf = withCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    const guard = withRevocationGuard({
      registry: revocation,
      getClaims: async () => ({ sid: "sid-1", sub: "user-1" }),
    });

    const policy = compose(csrf, guard);

    await expect(
      policy(
        {
          method: "POST",
          url: "https://api.example.com/transfer",
          headers: { "x-csrf-token": "csrf-1" },
        },
        async () => new Response(null, { status: 204 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_REVOKED" });
  });

  it("emits logout event through adapter on session manager", async () => {
    const events: string[] = [];
    const adapter = createAuthEventAdapter({
      onSessionLogout: async () => {
        events.push("session-logout");
      },
    });

    const session = createAuthSessionManager(authMemoryStore(), {
      broadcastChannel: "pureq:test:security-contract",
    });

    const unsubscribe = session.onEvent(adapter.listener);
    await session.logout("manual");
    unsubscribe();
    session.dispose();

    expect(events).toContain("session-logout");
  });
});
