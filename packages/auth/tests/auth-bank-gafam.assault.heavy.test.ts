import { describe, expect, it, vi } from "vitest";
import type { RequestConfig } from "@pureq/pureq";
import { createAuthBridge } from "../src/bridge";
import { createAuthError } from "../src/shared";
import { mapAuthErrorToHttp } from "../src/framework/recipes";
import { authRefresh } from "../src/middleware";
import { createAuthCsrfProtection } from "../src/csrf";
import { createAuthRevocationRegistry, withRevocationGuard } from "../src/revocation";

describe("bank/gafam assault: boundary saturation and defensive invariants", () => {
  it("rejects oversized cookie flood and falls back to bearer token", () => {
    const bridge = createAuthBridge();
    const oversizedCookie = `pureq_access_token=poison; ${"k=v;".repeat(20_000)}`;

    const state = bridge.readSession({
      headers: {
        cookie: oversizedCookie,
        authorization: "Bearer legit-fallback-token",
      },
    });

    expect(state.accessToken).toBe("legit-fallback-token");
    expect(state.refreshToken).toBeNull();
  });

  it("caps cookie segment parsing to avoid parser exhaustion", () => {
    const bridge = createAuthBridge();
    const prefix = Array.from({ length: 600 }, (_, i) => `junk_${i}=v_${i}`).join("; ");
    const cookie = `${prefix}; pureq_access_token=late-token`;

    const state = bridge.readSession({
      headers: {
        cookie,
        authorization: "Bearer safe-token",
      },
    });

    expect(state.accessToken).toBe("safe-token");
  });

  it("prevents refresh failure callback amplification under massive 401 storms", async () => {
    const onFailure = vi.fn();
    const middleware = authRefresh({
      triggerStatus: 401,
      refresh: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error("upstream auth unavailable");
      },
      onFailure,
    });

    const request: RequestConfig = {
      method: "GET",
      url: "https://api.example.com/account",
      headers: {
        Authorization: "Bearer stale",
      },
    };

    const burst = 300;
    const outcomes = await Promise.allSettled(
      Array.from({ length: burst }, () => middleware(request, async () => new Response(null, { status: 401 })))
    );

    expect(outcomes.every((result) => result.status === "rejected")).toBe(true);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("maintains policy boundary under mixed CSRF and revocation attack traffic", async () => {
    const csrf = createAuthCsrfProtection({
      expectedToken: () => "csrf-ok",
      headerName: "x-csrf-token",
      queryParamName: "csrfToken",
    });
    const registry = createAuthRevocationRegistry();

    for (let i = 0; i < 1000; i += 2) {
      registry.revokeSession(`sid-${i}`);
    }

    const guard = withRevocationGuard({
      registry,
      getClaims: async (req) => {
        const sid = req.headers?.["x-sid"];
        return sid ? { sid } : null;
      },
    });

    const middleware = csrf.middleware();

    const checks = await Promise.allSettled(
      Array.from({ length: 1200 }, (_, i) => {
        const method: RequestConfig["method"] = i % 3 === 0 ? "POST" : "GET";
        const sid = `sid-${i}`;
        const req: RequestConfig = {
          method,
          url: i % 5 === 0 ? "https://api.example.com/pay?csrfToken=csrf-ok" : "https://api.example.com/pay",
          headers: {
            "x-sid": sid,
            ...(method === "POST"
              ? { "x-csrf-token": i % 5 === 0 ? "csrf-ok" : "csrf-bad" }
              : {}),
          },
        };

        return middleware(req, (nextReq) => guard(nextReq, async () => new Response(null, { status: 204 })));
      })
    );

    const blocked = checks.filter((result) => result.status === "rejected").length;
    const allowed = checks.filter((result) => result.status === "fulfilled").length;

    expect(blocked).toBeGreaterThan(0);
    expect(allowed).toBeGreaterThan(0);
    expect(blocked + allowed).toBe(1200);
  });

  it("keeps HTTP status mapping deterministic for hostile error payloads", () => {
    const errors: unknown[] = [
      createAuthError("PUREQ_AUTH_CSRF_FAILED", "csrf failed"),
      createAuthError("PUREQ_AUTH_CSRF_INVALID_TOKEN", "csrf issue failed"),
      createAuthError("PUREQ_AUTH_REVOKED", "revoked"),
      createAuthError("PUREQ_OIDC_CALLBACK_ERROR", "oidc callback"),
      { code: "HOSTILE_UNKNOWN", message: "unknown" },
      new Error("runtime"),
    ];

    const mapped = Array.from({ length: 1000 }, (_, i) => mapAuthErrorToHttp(errors[i % errors.length]));
    const statusSet = new Set(mapped.map((entry) => entry.status));

    expect(statusSet.has(403)).toBe(true);
    expect(statusSet.has(401)).toBe(true);
    expect(statusSet.has(400)).toBe(true);
    expect(statusSet.has(500)).toBe(true);
  });
});
