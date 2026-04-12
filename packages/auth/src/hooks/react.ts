import type { AuthSessionHookResult, AuthSessionStore, ReactAuthHooks, ReactUseSyncExternalStore } from "../shared";

/**
 * Create React hooks for auth session state.
 * FEAT-M2: Returns { data, status, update } instead of just AuthSessionState.
 * DX-M2: Can be used with React context for SessionProvider pattern.
 */
export function createReactAuthHooks(
  sessionStore: AuthSessionStore,
  useSyncExternalStore: ReactUseSyncExternalStore
): ReactAuthHooks {
  return {
    useAuthSession(): AuthSessionHookResult {
      const data = useSyncExternalStore(
        sessionStore.subscribe,
        sessionStore.getSnapshot,
        sessionStore.getSnapshot
      );

      return {
        data,
        status: sessionStore.getStatus(),
        update: () => sessionStore.update(),
      };
    },

    refreshAuthSession() {
      return sessionStore.refresh();
    },

    disposeAuthSessionStore() {
      sessionStore.dispose();
    },
  };
}

export type { ReactAuthHooks, ReactUseSyncExternalStore } from "../shared";
