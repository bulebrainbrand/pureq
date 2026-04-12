# Event Adapters

`@pureq/auth` exposes a small event adapter layer for session events.

## Why It Exists

`createAuthSessionManager` already emits lifecycle events through `onEvent`, `auditEvent`, and `exporter`.
The adapter helpers make it easier to route those events to app-specific callbacks, analytics, or logs without writing switch statements everywhere.

## Basic Usage

```ts
import {
  authMemoryStore,
  createAuthEventAdapter,
  createAuthSessionManager,
} from "@pureq/auth";

const adapter = createAuthEventAdapter({
  onEvent: async (event) => {
    console.log("auth event", event.type);
  },
  onSessionLogout: async (event) => {
    await fetch("/internal/audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
  },
});

const session = createAuthSessionManager(authMemoryStore(), {
  auditEvent: async (event) => {
    console.log("audit", event.type);
  },
});

session.onEvent(adapter.listener);
```

## Notes

- `onEvent` handles every event type.
- Type-specific callbacks are optional and only run for the matching event.
- `onError` receives callback failures, allowing you to collect adapter-level errors centrally.

## Recommended Pattern

Use the adapter when:

- You want one handler object for multiple auth event sinks.
- You need typed callbacks for only a subset of session events.
- You want to forward events into an existing callback registry or app telemetry layer.