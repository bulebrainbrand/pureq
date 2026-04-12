import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@pureq/pureq";
import { createAuthBridge } from "../src/bridge";
import { createAuthCsrfProtection } from "../src/csrf";
import { createAuthRevocationRegistry } from "../src/revocation";

describe("chaos/heavy: hostile input and churn", () => {
  it("survives hostile cookie input and still resolves bearer fallback", () => {
    const bridge = createAuthBridge();
    const poisonedSegments = Array.from({ length: 1200 }, (_, i) => {
      if (i % 5 === 0) {
        return `%zz_invalid_${i}`;
      }
      return `junk_${i}=value_${i}`;
    }).join("; ");

    const snapshot = bridge.readSession({
      headers: {
        cookie: poisonedSegments,
        authorization: "Bearer fallback-token",
      },
    });

    expect(snapshot.accessToken).toBe("fallback-token");
    expect(snapshot.refreshToken).toBeNull();
  });

  it("keeps cookie precedence over authorization header when both exist", () => {
    const bridge = createAuthBridge();
    const snapshot = bridge.readSession({
      headers: {
        cookie: "pureq_access_token=cookie-token; pureq_refresh_token=refresh-token",
        authorization: "Bearer header-token",
      },
    });

    expect(snapshot.accessToken).toBe("cookie-token");
    expect(snapshot.refreshToken).toBe("refresh-token");
  });

  it("handles revocation churn with large cardinality and expiry sweeps", () => {
    const registry = createAuthRevocationRegistry();
    const now = Date.now();

    for (let i = 0; i < 4000; i += 1) {
      const expired = i % 2 === 0;
      const expiresAt = expired ? now - 10 : now + 600_000;
      registry.revokeToken(`tok-${i}`, expiresAt);
      registry.revokeSession(`sid-${i}`, expiresAt);
      registry.revokeSubject(`sub-${i}`, expiresAt);
    }

    registry.clearExpired(now);
    const snapshot = registry.snapshot();

    expect(snapshot.tokens.length).toBe(2000);
    expect(snapshot.sessions.length).toBe(2000);
    expect(snapshot.subjects.length).toBe(2000);

    expect(registry.isRevoked({ jti: "tok-3" })).toBe(true);
    expect(registry.isRevoked({ jti: "tok-2" })).toBe(false);
  });

  it("enforces CSRF validation across unsafe-method attack matrix", async () => {
    const protection = createAuthCsrfProtection({
      expectedToken: () => "csrf-expected",
      headerName: "x-csrf-token",
      queryParamName: "csrfToken",
    });

    const unsafeMethods: RequestConfig["method"][] = ["POST", "PUT", "PATCH", "DELETE"];

    for (const method of unsafeMethods) {
      const missingToken = await protection.verify({
        method,
        url: "https://api.example.com/unsafe",
      });
      expect(missingToken).toBe(false);

      const wrongToken = await protection.verify({
        method,
        url: "https://api.example.com/unsafe",
        headers: {
          "x-csrf-token": "csrf-wrong",
        },
      });
      expect(wrongToken).toBe(false);

      const correctHeader = await protection.verify({
        method,
        url: "https://api.example.com/unsafe",
        headers: {
          "x-csrf-token": "csrf-expected",
        },
      });
      expect(correctHeader).toBe(true);
    }

    const middleware = protection.middleware();
    await expect(
      middleware(
        {
          method: "POST",
          url: "https://api.example.com/unsafe",
          headers: {
            "x-csrf-token": "csrf-wrong",
          },
        },
        async () => new Response(null, { status: 200 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_CSRF_FAILED" });
  });
});
