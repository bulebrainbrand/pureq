import type { AuthSessionEvent, AuthSessionEventListener } from "../shared";

type AuthSessionTypedEvent<T extends AuthSessionEvent["type"]> = AuthSessionEvent & {
  readonly type: T;
};

export interface AuthEventAdapterOptions {
  readonly onEvent?: AuthSessionEventListener;
  readonly onTokensUpdated?: (event: AuthSessionTypedEvent<"tokens-updated">) => void | Promise<void>;
  readonly onTokensCleared?: (event: AuthSessionTypedEvent<"tokens-cleared">) => void | Promise<void>;
  readonly onSessionRefreshed?: (event: AuthSessionTypedEvent<"session-refreshed">) => void | Promise<void>;
  readonly onSessionRefreshFailed?: (event: AuthSessionTypedEvent<"session-refresh-failed">) => void | Promise<void>;
  readonly onSessionLogout?: (event: AuthSessionTypedEvent<"session-logout">) => void | Promise<void>;
  readonly onSessionRegenerated?: (event: AuthSessionTypedEvent<"session-regenerated">) => void | Promise<void>;
  readonly onError?: (error: Error, event: AuthSessionEvent) => void | Promise<void>;
}

export interface AuthEventAdapter {
  readonly listener: AuthSessionEventListener;
  dispatch(event: AuthSessionEvent): Promise<void>;
}

async function runSafely<T extends AuthSessionEvent["type"]>(
  handler: ((event: AuthSessionTypedEvent<T>) => void | Promise<void>) | undefined,
  event: AuthSessionTypedEvent<T>,
  onError: ((error: Error, event: AuthSessionEvent) => void | Promise<void>) | undefined
): Promise<void> {
  if (!handler) {
    return;
  }

  try {
    await handler(event);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (onError) {
      await onError(normalized, event);
      return;
    }

    throw normalized;
  }
}

export function createAuthEventAdapter(options: AuthEventAdapterOptions = {}): AuthEventAdapter {
  const dispatch = async (event: AuthSessionEvent): Promise<void> => {
    await options.onEvent?.(event);

    switch (event.type) {
      case "tokens-updated":
        await runSafely(
          options.onTokensUpdated,
          event as AuthSessionTypedEvent<"tokens-updated">,
          options.onError
        );
        break;
      case "tokens-cleared":
        await runSafely(
          options.onTokensCleared,
          event as AuthSessionTypedEvent<"tokens-cleared">,
          options.onError
        );
        break;
      case "session-refreshed":
        await runSafely(
          options.onSessionRefreshed,
          event as AuthSessionTypedEvent<"session-refreshed">,
          options.onError
        );
        break;
      case "session-refresh-failed":
        await runSafely(
          options.onSessionRefreshFailed,
          event as AuthSessionTypedEvent<"session-refresh-failed">,
          options.onError
        );
        break;
      case "session-logout":
        await runSafely(
          options.onSessionLogout,
          event as AuthSessionTypedEvent<"session-logout">,
          options.onError
        );
        break;
      case "session-regenerated":
        await runSafely(
          options.onSessionRegenerated,
          event as AuthSessionTypedEvent<"session-regenerated">,
          options.onError
        );
        break;
    }
  };

  return {
    listener: dispatch,
    dispatch,
  };
}

export function composeAuthEventListeners(...listeners: readonly AuthSessionEventListener[]): AuthSessionEventListener {
  return async (event) => {
    for (const listener of listeners) {
      await listener(event);
    }
  };
}