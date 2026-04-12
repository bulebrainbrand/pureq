import { describe, expect, it } from "vitest";
import { createAuthRevocationRegistry, withRevocationGuard } from "../src/revocation";

describe("createAuthRevocationRegistry", () => {
  it("revokes token, session, and subject identifiers", () => {
    const registry = createAuthRevocationRegistry();
    registry.revokeToken("jti-1");
    registry.revokeSession("sid-1");
    registry.revokeSubject("sub-1");

    expect(registry.isRevoked({ jti: "jti-1" })).toBe(true);
    expect(registry.isRevoked({ sid: "sid-1" })).toBe(true);
    expect(registry.isRevoked({ sub: "sub-1" })).toBe(true);
    expect(registry.isRevoked({ jti: "jti-2", sid: "sid-2", sub: "sub-2" })).toBe(false);
  });

  it("clears expired revocations", () => {
    const registry = createAuthRevocationRegistry();
    registry.revokeToken("jti-expired", Date.now() - 1);
    registry.clearExpired();

    expect(registry.isRevoked({ jti: "jti-expired" })).toBe(false);
  });

  it("throws when the revocation guard blocks a revoked session", async () => {
    const registry = createAuthRevocationRegistry();
    registry.revokeSession("sid-blocked");

    const middleware = withRevocationGuard({
      registry,
      getClaims: () => ({ sid: "sid-blocked", sub: "user-1", jti: "jti-1" }),
    });

    await expect(
      middleware(
        {
          method: "GET",
          url: "https://api.example.com/me",
        },
        async () => new Response(null, { status: 200 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_REVOKED" });
  });
});