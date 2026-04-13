import type {
  AuthFrameworkContext,
  AuthFrameworkContextOptions,
  AuthSessionState,
  AuthSessionTransferPayload,
  AuthTokens,
} from "../shared/index.js";
import { createAuthRequestAdapter } from "../adapters/index.js";
export { createAuthRouteHandlerRecipe, createAuthServerActionRecipe, mapAuthErrorToHttp } from "./recipes.js";
export {
  createExpressAuthKitPack,
  createFastifyAuthKitPack,
  createNextAuthKitPack,
  createReactAuthKitBootstrapPack,
} from "./packs.js";

function emptyState(): AuthSessionState {
  return { accessToken: null, refreshToken: null };
}

function buildSessionTransferPayload(
  state: AuthSessionState,
  setCookieHeaders: readonly string[]
): AuthSessionTransferPayload {
  return {
    format: "pureq-auth-session-transfer/v1",
    issuedAt: Date.now(),
    state,
    setCookieHeaders,
  };
}

/**
 * Create a framework context that bootstraps auth from a request.
 * ARCH-3: Catches bootstrap errors and falls back to empty session.
 */
export async function createAuthFrameworkContext(
  options: AuthFrameworkContextOptions = {}
): Promise<AuthFrameworkContext> {
  const adapter = createAuthRequestAdapter(options);
  let state: AuthSessionState;

  if (options.request) {
    try {
      state = await adapter.bootstrap(options.request);
    } catch (error) {
      options.onBootstrapError?.(error);
      state = emptyState();
    }
  } else {
    state = await adapter.session.getState();
  }

  const syncState = async (): Promise<AuthSessionState> => {
    state = await adapter.session.getState();
    return state;
  };

  return {
    adapter,

    getState(): AuthSessionState {
      return state;
    },

    refreshState(): Promise<AuthSessionState> {
      return syncState();
    },

    async setTokens(tokens: AuthTokens): Promise<AuthSessionState> {
      await adapter.session.setTokens(tokens);
      return syncState();
    },

    async clearSession(): Promise<AuthSessionState> {
      await adapter.session.clear();
      return syncState();
    },

    toResponseHeaders(headers?: HeadersInit): Headers {
      return adapter.buildResponseHeaders(state, headers);
    },

    toResponseInit(init?: ResponseInit): ResponseInit {
      return adapter.buildResponseInit(state, init);
    },

    toSessionTransferPayload(): AuthSessionTransferPayload {
      return buildSessionTransferPayload(state, adapter.buildSetCookieHeaders(state));
    },

    dispose(): void {
      adapter.session.dispose();
    },
  };
}

export type { AuthFrameworkContext, AuthFrameworkContextOptions } from "../shared/index.js";
