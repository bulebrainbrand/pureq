# Session Event Operations Guide

This guide explains how to operate `@pureq/auth` session events in production.

## Why This Exists

`createAuthSessionManager` emits lifecycle events such as:

- `tokens-updated`
- `session-refreshed`
- `session-refresh-failed`
- `tokens-cleared`
- `session-logout`

These events can be consumed via:

- `auditEvent` callback
- `exporter` adapter
- `onEvent` listeners

Use these channels for audit logs, security investigations, and operational dashboards.

## Recommended Pipeline

1. Use `createBufferedSessionEventExporter` to batch event writes.
2. Pass `exporter` and `auditEvent` into `createAuthSessionManager`.
3. Compose multiple sinks using `composeSessionEventAudits`.
4. Flush buffered events during app shutdown.

```ts
import {
  authMemoryStore,
  composeSessionEventAudits,
  createAuthSessionManager,
  createBufferedSessionEventExporter,
  createConsoleSessionEventAudit,
} from "@pureq/auth";

const exporter = createBufferedSessionEventExporter({
  flushSize: 50,
  sink: async (events) => {
    await fetch("/internal/auth-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(events),
    });
  },
});

const audit = composeSessionEventAudits(
  createConsoleSessionEventAudit(),
  exporter.auditEvent
);

const session = createAuthSessionManager(authMemoryStore(), {
  auditEvent: audit,
  exporter: {
    export: exporter.auditEvent,
    flush: exporter.flush,
    dispose: exporter.clear,
  },
});

// On graceful shutdown:
await exporter.flush();
session.dispose();
```

## Operational Rules

- Never log raw tokens from `state` in production.
- Persist `source` (`local`/`remote`) to separate user action vs cross-tab sync.
- Alert on repeated `session-refresh-failed` events.
- Treat unexpected `session-logout` spikes as potential incident signals.

## Incident Triage Hints

- Many `session-refresh-failed` in a short window: check IdP outage, network egress, clock skew.
- `remote` logout storms: validate broadcast channel naming and shared origin behavior.
- Missing refresh events: verify `needsRefresh` threshold and token `exp` claims.

## Readiness + Events Integration

Treat adapter readiness and session events as one operational boundary:

1. Emit adapter readiness status at process startup.
2. Correlate `session-refresh-failed` spikes with readiness warnings from the same deployment.
3. Block promotion when readiness is `blocked` or when warning-driven failure policy is enabled.

Recommended structured fields:

- `deploymentId`
- `adapterReadinessStatus`
- `eventType`
- `source` (`local` or `remote`)
- `errorCode`

This makes regressions traceable across rollout stages and supports fast rollback decisions.