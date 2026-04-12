import { describe, expect, it } from "vitest";
import { createAuthError } from "../src/shared";
import { createAuthFrameworkContext } from "../src/framework";
import {
  createAuthRouteHandlerRecipe,
  createAuthServerActionRecipe,
  mapAuthErrorToHttp,
} from "../src/framework/recipes";

describe("framework recipes", () => {
  it("maps auth errors to HTTP status codes", () => {
    const unauthorized = mapAuthErrorToHttp(createAuthError("PUREQ_AUTH_UNAUTHORIZED", "unauthorized"));
    const csrf = mapAuthErrorToHttp(createAuthError("PUREQ_AUTH_CSRF_INVALID", "csrf invalid"));
    const oidc = mapAuthErrorToHttp(createAuthError("PUREQ_OIDC_EXCHANGE_FAILED", "oidc failed"));

    expect(unauthorized.status).toBe(401);
    expect(csrf.status).toBe(403);
    expect(oidc.status).toBe(400);
  });

  it("creates route handler responses with auth cookies", async () => {
    const context = await createAuthFrameworkContext({
      request: {
        headers: {
          cookie: "pureq_access_token=old-a; pureq_refresh_token=old-r",
        },
      },
    });

    await context.setTokens({ accessToken: "new-a", refreshToken: "new-r" });

    const recipe = createAuthRouteHandlerRecipe(context);
    const ok = recipe.json({ ok: true }, { status: 201 });

    expect(ok.status).toBe(201);
    expect(ok.headers.get("content-type") ?? "").toContain("application/json");
    expect(ok.headers.get("set-cookie") ?? "").toContain("pureq_access_token=new-a");

    const fail = recipe.error(createAuthError("PUREQ_AUTH_CSRF_INVALID", "csrf invalid"));
    expect(fail.status).toBe(403);

    context.dispose();
  });

  it("runs server action recipe and returns typed result", async () => {
    const context = await createAuthFrameworkContext({
      request: {
        headers: {
          cookie: "pureq_access_token=token-a; pureq_refresh_token=token-r",
        },
      },
    });

    const recipe = createAuthServerActionRecipe(context);

    const success = await recipe.run(async () => ({ value: 42 }));
    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.data.value).toBe(42);
      expect(success.transferPayload.format).toBe("pureq-auth-session-transfer/v1");
    }

    const failure = await recipe.run(async () => {
      throw createAuthError("PUREQ_AUTH_UNAUTHORIZED", "auth required");
    });

    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error.status).toBe(401);
      expect(failure.responseInit.status).toBe(401);
    }

    context.dispose();
  });
});
