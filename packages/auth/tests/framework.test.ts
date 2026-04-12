import { describe, expect, it } from "vitest";
import { createAuthFrameworkContext } from "../src/framework";

describe("framework adapters", () => {
  it("creates context from request and emits response cookie headers", async () => {
    const context = await createAuthFrameworkContext({
      request: {
        headers: {
          cookie: "pureq_access_token=access-a; pureq_refresh_token=refresh-a",
        },
      },
    });

    expect(context.getState()).toMatchObject({
      accessToken: "access-a",
      refreshToken: "refresh-a",
    });

    await context.setTokens({ accessToken: "access-b", refreshToken: "refresh-b" });

    const headers = context.toResponseHeaders({ "x-auth-source": "framework" });
    const setCookie = headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pureq_access_token=access-b");
    expect(setCookie).toContain("pureq_refresh_token=refresh-b");
    expect(headers.get("x-auth-source")).toBe("framework");

    const payload = context.toSessionTransferPayload();
    expect(payload.format).toBe("pureq-auth-session-transfer/v1");
    expect(payload.state).toMatchObject({
      accessToken: "access-b",
      refreshToken: "refresh-b",
    });
    expect(payload.setCookieHeaders.join("; ")).toContain("pureq_access_token=access-b");

    await context.clearSession();
    const clearInit = context.toResponseInit({ status: 200 });
    expect(new Headers(clearInit.headers).get("set-cookie") ?? "").toContain("Max-Age=0");

    context.dispose();
  });
});
