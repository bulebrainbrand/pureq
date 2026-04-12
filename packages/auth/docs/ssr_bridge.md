# SSR / BFF Bridge

`@pureq/auth` provides a framework-neutral bridge for server-side rendering and backend-for-frontend setups.

The goal is to keep bridging logic as a small policy layer: read auth state from incoming request headers, hydrate a session manager, and emit `Set-Cookie` headers for the response path.

## When to Use

Use the bridge when you need to:

- bootstrap a session manager from request cookies on the server
- pass access tokens from SSR into a request-scoped auth state
- emit cookies after login, refresh, or logout
- keep framework-specific integration code thin and explicit

## Basic Usage

```ts
import { createAuthBridge, createAuthSessionManager, authMemoryStore } from "@pureq/auth";

const bridge = createAuthBridge({
  accessTokenCookieName: "auth_access",
  refreshTokenCookieName: "auth_refresh",
});

const session = createAuthSessionManager(authMemoryStore(), {
  broadcastChannel: "pureq:ssr:bridge",
});

const snapshot = bridge.readSession({
  headers: {
    cookie: "auth_access=access-1; auth_refresh=refresh-1",
  },
});

await bridge.hydrateSessionManager(session, {
  headers: {
    cookie: "auth_access=access-1; auth_refresh=refresh-1",
  },
});

const cookieHeaders = bridge.buildSetCookieHeaders(snapshot);
```

## Notes

- `readSession()` understands either cookie headers or a bearer authorization header.
- `hydrateSessionManager()` is intentionally small and side-effect free beyond the session manager update.
- `buildSetCookieHeaders()` returns header strings so the caller can attach them to any server framework response object.

## Recommended Pattern

Keep framework code thin:

- route handler or server action reads the incoming request
- bridge extracts the auth state
- session manager is hydrated once per request scope
- response code applies the returned cookie headers

This keeps framework-specific concerns out of the auth core and matches the `pureq` policy-first model.

## Finalized Handoff Flow (SSR / BFF / Edge)

Use the same sequence across runtimes so request bootstrap and client handoff stay consistent.

1. Server receives request and creates framework context from the incoming headers.
2. Framework context bootstraps auth state through request adapter + bridge.
3. Server executes protected logic with request-scoped session state.
4. Server emits response headers and optional transfer payload for client bootstrap.
5. Client initializes a session store from the transfer payload and subscribes to updates.

```ts
import {
  createAuthFrameworkContext,
  createAuthSessionManager,
  createAuthSessionStore,
  authMemoryStore,
} from "@pureq/auth";

// Server side (SSR/BFF/edge route handler)
const context = await createAuthFrameworkContext({ request });
const state = context.getState();

// Optional: rotate/update state in request scope
if (!state.accessToken) {
  await context.clearSession();
}

const transferPayload = context.toSessionTransferPayload();
const responseInit = context.toResponseInit({ status: 200 });

// Client side bootstrap
const session = createAuthSessionManager(authMemoryStore());
const store = createAuthSessionStore(session, { transferPayload });
```

### Runtime Notes

- SSR: use request-local context per incoming request; do not reuse session manager across requests.
- BFF: apply `toResponseHeaders` or `toResponseInit` on every auth-mutating endpoint.
- Edge: keep bootstrap deterministic and stateless; avoid process-level mutable auth state.
