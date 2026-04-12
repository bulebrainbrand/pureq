# Migration Playbook

This playbook is for moving from legacy token/session shapes to `@pureq/auth` with rollback safety.

## Goal

Migrate without downtime while preserving observability and rollback control.

## Phase 0: Baseline and Safety Rails

1. Freeze current auth behavior in smoke checks.
2. Record current token sources (cookie/storage/header/session payload).
3. Define rollback trigger thresholds (auth error rate, refresh failure rate, login success drop).

Rollback checkpoint:

- Keep old token read path enabled behind a feature flag until Phase 4.

## Phase 1: Normalize Legacy Inputs

Use `normalizeLegacyAuthTokens` against representative payloads from production logs/samples.

```ts
import { normalizeLegacyAuthTokens } from "@pureq/auth";

const normalized = normalizeLegacyAuthTokens(legacyPayload);
```

Failure handling:

- if `normalized.tokens` is `null`, treat input as non-migratable and keep legacy path for that request.
- never throw on unknown shape; log and continue with fallback.

Observability checkpoints:

- count by `source` (`legacy-string`, `legacy-object`, `legacy-nested`, `empty`)
- track non-migratable ratio over time

## Phase 2: Migrate to Store/Session

Move normalized tokens into current store/session APIs.

```ts
import {
  migrateLegacyTokensToStore,
  hydrateSessionManagerFromLegacy,
} from "@pureq/auth";

await migrateLegacyTokensToStore(store, legacyPayload);
await hydrateSessionManagerFromLegacy(session, legacyPayload);
```

Rollback checkpoint:

- preserve legacy write path in parallel (dual-write optional) until parity is stable.

Failure handling:

- on migration write failure, clear partially written state and fall back to legacy session for that request.

Observability checkpoints:

- migration success/failure counters
- post-migration token presence checks (`accessToken`/`refreshToken`)

## Phase 3: Server Adapter + Client Handoff

Use framework adapter context and transfer payload as the server/client seam.

```ts
const context = await createAuthFrameworkContext({ request });
const transfer = context.toSessionTransferPayload();
```

Client side:

```ts
const sessionStore = createAuthSessionStore(sessionManager, { transferPayload: transfer });
```

Rollback checkpoint:

- keep legacy bootstrap payload in response envelope until client verifies new transfer path.

Failure handling:

- if transfer payload is invalid/missing, initialize client store from empty state and trigger controlled re-auth path.

Observability checkpoints:

- transfer payload format/version match rate
- client bootstrap failure count

## Phase 4: Cutover

1. Enable `@pureq/auth` as primary path.
2. Keep legacy read path for limited grace period.
3. Remove legacy path after error-rate and login KPI stability window.

Rollback checkpoint:

- instant flag rollback to legacy path remains available during grace period.

## Cutover Day Checklist

- [ ] migration counters visible in dashboard
- [ ] auth refresh failure alerts configured
- [ ] transfer payload version mismatch alert configured
- [ ] adapter readiness preflight gate enabled on startup
- [ ] rollback flag tested in staging
- [ ] incident owner and rollback procedure documented

## Starter Preflight Gate (Recommended)

For production cutover, run adapter readiness before serving traffic.

```ts
import { createAuthStarter } from "@pureq/auth";

const starter = await createAuthStarter({
  adapter,
  adapterReadiness: {
    deployment: "production",
    requireEmailProviderSupport: true,
    failOnNeedsAttention: true,
    onReport: (report) => {
      console.info("auth adapter readiness", {
        status: report.status,
        blockers: report.blockers,
        warnings: report.warnings,
      });
    },
  },
});
```

Operational policy:

- `blocked`: fail startup and keep rollback flag path enabled.
- `needs-attention`: fail startup in strict mode (`failOnNeedsAttention: true`) during cutover window.
- `ready`: continue startup and publish readiness result to deployment logs.

## Post-Cutover Verification Window

Keep the verification window explicit for at least one release cycle.

1. Compare login success rate and refresh failure rate versus pre-cutover baseline.
2. Confirm migration source distribution trends toward non-legacy paths.
3. Confirm no sustained rise in `session-refresh-failed` and callback replay errors.
4. Keep rollback switch armed until all checks are stable.

## Common Pitfalls

- migrating cookie names without versioned rollout
- skipping transfer payload version checks
- skipping startup readiness gate for SQL/email-backed production paths
- removing legacy fallback before observing real traffic stability
