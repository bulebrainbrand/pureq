import type { AuthSessionManager, AuthSessionState, AuthSessionStatus, AuthSessionStore, AuthSessionStoreOptions } from "../shared";
export { createReactAuthHooks } from "./react";
export { createVueAuthSessionComposable } from "./vue";

function emptyState(): AuthSessionState {
  return {
    accessToken: null,
    refreshToken: null,
  };
}

/**
 * Create a subscribable session store that bridges session manager events to UI frameworks.
 * FEAT-M2: Tracks loading/authenticated/unauthenticated status.
 * FEAT-M3: Provides update() method for server-round-trip session updates.
 */
export function createAuthSessionStore(
  session: AuthSessionManager,
  options: AuthSessionStoreOptions = {}
): AuthSessionStore {
  let disposed = false;
  let snapshot = options.transferPayload?.state ?? options.initialState ?? emptyState();
  let status: AuthSessionStatus = "loading";
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setSnapshot = (next: AuthSessionState): void => {
    snapshot = next;
    status = next.accessToken ? "authenticated" : "unauthenticated";
    notify();
  };

  const normalizeEventState = (eventType: string, eventState?: AuthSessionState): AuthSessionState | null => {
    if (eventState) {
      return eventState;
    }

    if (eventType === "tokens-cleared" || eventType === "session-logout") {
      return emptyState();
    }

    return null;
  };

  const unsubscribeSession = session.onEvent((event) => {
    if (disposed) {
      return;
    }

    const next = normalizeEventState(event.type, event.state);
    if (next) {
      setSnapshot(next);
    }
  });

  void session.getState().then((state) => {
    if (!disposed) {
      setSnapshot(state);
    }
  });

  return {
    getSnapshot(): AuthSessionState {
      return snapshot;
    },

    getStatus(): AuthSessionStatus {
      return status;
    },

    subscribe(listener: () => void): () => void {
      if (disposed) {
        return () => {};
      }

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async refresh(): Promise<AuthSessionState> {
      if (disposed) {
        return snapshot;
      }

      const state = await session.getState();
      setSnapshot(state);
      return state;
    },

    /** FEAT-M3: Trigger a server-round-trip session update. */
    async update(): Promise<AuthSessionState> {
      if (disposed) {
        return snapshot;
      }

      const state = await session.getState();
      setSnapshot(state);
      return state;
    },

    dispose(): void {
      if (disposed) {
        return;
      }

      disposed = true;
      unsubscribeSession();
      listeners.clear();
    },
  };
}

export type { AuthSessionStore, AuthSessionStoreOptions } from "../shared";
