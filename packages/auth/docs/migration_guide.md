# Migration Guide

`@pureq/auth` includes small helpers for moving from older auth shapes into the current `AuthStore` and `AuthSessionManager` model.

## Why This Exists

Teams often start with one of these shapes:

- a bare access token string in memory
- `{ accessToken, refreshToken }` objects from a custom backend
- snake_case payloads from an OAuth or NextAuth-style integration
- nested `tokens` payloads in session bootstrap responses

The migration helpers normalize those shapes without pulling framework-specific logic into the core package.

## Available Helpers

- `normalizeLegacyAuthTokens(input)`
- `migrateLegacyTokensToStore(store, input)`
- `hydrateSessionManagerFromLegacy(session, input)`
- `analyzeAuthMigration(input)`
- `formatMigrationParityReport(analysis)`
- `generateMigrationChecklists(analysis)`

## Auth.js Concept Map

Use this mapping when porting a conventional Auth.js setup into `@pureq/auth`.

| Auth.js concept | @pureq/auth surface | Notes |
| --- | --- | --- |
| `signIn`, `callback`, `session`, `signOut` routes | `createAuth().handlers.handleSignIn`, `handleCallback`, `handleSession`, `handleSignOut` | Route handlers are explicit and can be wired into any framework. |
| Provider configuration | `credentialsProvider`, `emailProvider`, `oidcProviders`, `createOIDCFlowFromProvider` | Provider-specific quirks remain visible instead of being hidden behind a global adapter. |
| Session bootstrap | `createAuthFrameworkContext()`, `createAuthSessionStore()` | Use the framework context on the server and the session store on the client. |
| Refresh / rotation | `authRefresh`, `withTokenLifecycle`, `rotationPolicy` | Refresh policy is explicit and should be chosen per session model. |
| CSRF protection | `createAuthCsrfProtection()`, `withCsrfProtection` | Opt-in for browser-mutating flows that accept browser-sent credentials. |
| Logout / revocation | `createAuthRevocationRegistry()`, `withRevocationGuard` | Use `sid` for session invalidation and `jti` for individual token invalidation. |
| Cross-tab propagation | `withBroadcastSync` | Broadcast payloads are signed when sync is enabled. |
| Legacy payload migration | `normalizeLegacyAuthTokens()`, `migrateLegacyTokensToStore()`, `hydrateSessionManagerFromLegacy()` | Intended for migration/bootstrap only. |

## Migration Gaps To Check

The following areas still need explicit validation when replacing Auth.js in a real app:

- account linking and multi-account identity lifecycles
- provider-specific callback quirks and adapter assumptions
- database adapter breadth and compatibility guarantees
- UI handoff patterns that were previously implicit in Auth.js helpers
- observability and incident-response hooks around refresh, replay, and logout events

## Basic Usage

```ts
import {
  authMemoryStore,
  createAuthSessionManager,
  hydrateSessionManagerFromLegacy,
  migrateLegacyTokensToStore,
  normalizeLegacyAuthTokens,
} from "@pureq/auth";

const legacyPayload = {
  access_token: "access-1",
  refresh_token: "refresh-1",
};

const normalized = normalizeLegacyAuthTokens(legacyPayload);

if (normalized.tokens) {
  const store = authMemoryStore();
  await migrateLegacyTokensToStore(store, legacyPayload);

  const session = createAuthSessionManager(store);
  await hydrateSessionManagerFromLegacy(session, legacyPayload);
}
```

## Recommended Pattern

Use these helpers during migration or bootstrap only.

- Normalize legacy payloads once.
- Store the result in the current `AuthStore` / `AuthSessionManager` APIs.
- Keep framework-specific request or response handling outside the auth core.

## Migration Diagnostics (Cutover Confidence)

Use diagnostics before cutover:

```ts
import {
  analyzeAuthMigration,
  formatMigrationParityReport,
  generateMigrationChecklists,
} from "@pureq/auth";

const analysis = analyzeAuthMigration({
  legacyInput: { access_token: "a", refresh_token: "r" },
  hasProviders: true,
  hasAdapter: true,
  hasCallbacks: true,
  hasSsrBridge: true,
  enableCsrf: true,
  enableRevocation: true,
});

const parityReport = formatMigrationParityReport(analysis);
const checklists = generateMigrationChecklists(analysis);
```

The parity report should be attached to release notes for migration deployments.

## Notes

- Unknown shapes return `null` tokens instead of throwing.
- Empty or missing legacy values are treated as no-op migration input.
- The helpers are intentionally small so they can be composed with SSR / BFF bridge code.
- Auth.js migration is intentionally staged: normalize first, then adopt the current store/session APIs, then wire framework adapters and route handlers.
