import { describe, expect, it, vi } from "vitest";
import { createAuthCsrfProtection, withCsrfProtection } from "../src/csrf";

describe("createAuthCsrfProtection", () => {
  it("issues non-empty tokens", async () => {
    const protection = createAuthCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    const token = await protection.issueToken();
    expect(token).toContain("csrf-");
    expect(token.length).toBeGreaterThan(5);
  });

  it("accepts matching header tokens for unsafe methods", async () => {
    const protection = createAuthCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    const middleware = protection.middleware();
    const response = await middleware(
      {
        method: "POST",
        url: "https://api.example.com/submit",
        headers: { "x-csrf-token": "csrf-1" },
      },
      async () => new Response(null, { status: 204 })
    );

    expect(response.status).toBe(204);
  });

  it("rejects missing or mismatched csrf tokens", async () => {
    const middleware = withCsrfProtection({
      expectedToken: () => "csrf-1",
    });

    await expect(
      middleware(
        {
          method: "POST",
          url: "https://api.example.com/submit",
        },
        async () => new Response(null, { status: 204 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_CSRF_FAILED" });

    await expect(
      middleware(
        {
          method: "POST",
          url: "https://api.example.com/submit",
          headers: { "x-csrf-token": "csrf-2" },
        },
        async () => new Response(null, { status: 204 })
      )
    ).rejects.toMatchObject({ code: "PUREQ_AUTH_CSRF_FAILED" });
  });
});