import { describe, expect, it } from "vitest";
import type { RequestConfig } from "@pureq/pureq";
import { authBearer } from "../src/middleware";
import { parseOIDCCallbackParams } from "../src/oidc";

describe("adversarial heavy: zero-day style input abuse", () => {
  it("rejects OIDC callback parameter pollution (duplicate code/state)", () => {
    expect(() => parseOIDCCallbackParams("?code=a&code=b&state=s", "s")).toThrow(/duplicated code parameter/);
    expect(() => parseOIDCCallbackParams("?code=a&state=s1&state=s2", "s1")).toThrow(/duplicated state parameter/);
  });

  it("rejects oversized callback fields to prevent parser abuse", () => {
    const large = "x".repeat(5000);
    expect(() => parseOIDCCallbackParams(`?code=${large}&state=s`, "s")).toThrow(/too large/);
    expect(() => parseOIDCCallbackParams(`?error=e&error_description=${large}`)).toThrow(/too large/);
  });

  it("blocks header injection payloads in bearer token provider", async () => {
    const middleware = authBearer({
      getToken: () => "ok-token\r\nX-Injected: 1",
    });

    const req: RequestConfig = {
      method: "GET",
      url: "https://api.example.com",
    };

    await expect(middleware(req, async () => new Response(null, { status: 200 }))).rejects.toMatchObject({
      code: "PUREQ_AUTH_INVALID_TOKEN",
    });
  });

  it("blocks oversized bearer tokens before request dispatch", async () => {
    const hugeToken = "a".repeat(9000);
    const middleware = authBearer({
      getToken: () => hugeToken,
    });

    const req: RequestConfig = {
      method: "GET",
      url: "https://api.example.com",
    };

    await expect(middleware(req, async () => new Response(null, { status: 200 }))).rejects.toMatchObject({
      code: "PUREQ_AUTH_INVALID_TOKEN",
    });
  });

  it("keeps mixed malicious token flood blocked at high volume", async () => {
    const payloads = Array.from({ length: 1200 }, (_, i) => {
      if (i % 4 === 0) {
        return "x".repeat(9000);
      }
      if (i % 4 === 1) {
        return "bad\nnewline";
      }
      if (i % 4 === 2) {
        return "bad\rreturn";
      }
      return "\u0000nullbyte";
    });

    const outcomes = await Promise.allSettled(
      payloads.map((token) => {
        const middleware = authBearer({
          getToken: () => token,
        });
        return middleware(
          {
            method: "GET",
            url: "https://api.example.com/resource",
          },
          async () => new Response(null, { status: 200 })
        );
      })
    );

    expect(outcomes.every((result) => result.status === "rejected")).toBe(true);
  });
});
