# Security Controls

This guide covers the CSRF and revocation primitives provided by `@pureq/auth`.

## CSRF Protection

Use `createAuthCsrfProtection` when the client needs to submit a request token that must match a server-issued value.

```ts
import { createAuthCsrfProtection } from "@pureq/auth/csrf";

const csrf = createAuthCsrfProtection({
  expectedToken: () => sessionStorage.getItem("csrf-token"),
  headerName: "x-csrf-token",
});

const token = await csrf.issueToken();
sessionStorage.setItem("csrf-token", token);
```

The middleware returned by `csrf.middleware()` checks unsafe methods by default and accepts either a header token or a query parameter token.

## Revocation

Use `createAuthRevocationRegistry` to track invalidated token IDs, session IDs, and subjects.

```ts
import { createAuthRevocationRegistry, withRevocationGuard } from "@pureq/auth/revocation";

const registry = createAuthRevocationRegistry();
registry.revokeSession("sid-123");

const guard = withRevocationGuard({
  registry,
  getClaims: async (req) => ({ sid: "sid-123", sub: "user-1" }),
});
```

## Operational Guidance

- Prefer short-lived access tokens and use revocation for incident response and logout propagation.
- Use revocation by `sid` for session invalidation and by `jti` for individual token invalidation.
- Pair CSRF protection with cookie-based auth flows or any state-changing route that accepts browser-sent credentials.

## Automatic vs Opt-In Security Behavior

| Behavior | Automatic | Opt-in surface |
| --- | --- | --- |
| OIDC callback replay protection (TTL cache) | Yes | Not required |
| JWT verification rejects `alg:none` and malformed tokens | Yes (verify/decode paths) | Not required |
| Cookie security defaults (`HttpOnly`, `Secure`) in cookie-backed flows | Yes | Not required |
| CSRF checks for browser-mutating requests | No | `createAuthCsrfProtection`, `withCsrfProtection` |
| Cross-tab session propagation | No | `withBroadcastSync` |
| At-rest token encryption | No | encrypted store APIs |
| Revocation guard on protected routes | No | `withRevocationGuard` |

## Replay, Rotation, and Cross-Tab Sync

These three behaviors are documented together because they form the main session-lifecycle boundary for `@pureq/auth`.

- Refresh rotation is explicit: choose the session `rotationPolicy` that matches your storage model, then let `authRefresh` deduplicate in-flight refreshes so a single refresh response can fan out to waiting requests.
- OIDC callback replay is blocked automatically by a TTL-backed replay cache. Treat replay failures as a security signal, not a transient retry condition.
- Cross-tab sync is opt-in. When enabled through `withBroadcastSync`, session updates are sent through a signed `BroadcastChannel` payload so other tabs can observe the change safely.
- Session event exports should record whether the change came from local activity or remote sync so operational dashboards can separate user actions from cross-tab propagation.

## Operational Runbook (Minimum)

Apply these checks for production operations:

1. Block deploy when adapter readiness is `blocked`.
2. During migration/cutover windows, also block on `needs-attention`.
3. Alert on sustained `PUREQ_AUTH_CSRF_FAILED` growth and callback replay errors.
4. Alert on revocation guard denials that exceed expected logout/incident patterns.

Suggested thresholds:

- `session-refresh-failed` ratio > 1% for 10 minutes.
- `PUREQ_AUTH_CSRF_FAILED` ratio > 0.5% for browser-mutating routes.
- callback replay errors > baseline + 3 sigma for 15 minutes.

Response playbook:

- rotate suspicious tokens/sessions by `sid` and `jti`.
- enable stricter adapter readiness gate if deploy introduced adapter warnings.
- trigger rollback flag if login success or refresh KPIs regress beyond threshold.