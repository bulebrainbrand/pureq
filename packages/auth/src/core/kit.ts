import type {
  AuthKit,
  AuthKitConfig,
  AuthKitPolicyOverrideEvent,
  AuthKitRuntimeMode,
  AuthSessionStore,
  AuthSessionStoreOptions,
  AuthTokenRotationPolicy,
  ReactUseSyncExternalStore,
  VueRuntimeBindings,
} from "../shared/index.js";
import { createReactAuthHooks, createAuthSessionStore, createVueAuthSessionComposable } from "../hooks/index.js";
import { createAuth } from "./index.js";

function mergeSessionStoreOptions(
  base: AuthSessionStoreOptions | undefined,
  next: AuthSessionStoreOptions | undefined
): AuthSessionStoreOptions {
  return {
    ...(base ?? {}),
    ...(next ?? {}),
  };
}

type SecurityPreset = {
  readonly bridge: {
    readonly secure: boolean;
    readonly httpOnly: boolean;
    readonly sameSite: "lax" | "strict" | "none";
  };
  readonly session: {
    readonly rotationPolicy: AuthTokenRotationPolicy;
    readonly minRefreshIntervalMs: number;
  };
};

function getSecurityPreset(mode: AuthKitRuntimeMode): SecurityPreset {
  if (mode === "browser-spa") {
    return {
      bridge: {
        secure: true,
        httpOnly: false,
        sameSite: "lax",
      },
      session: {
        rotationPolicy: "preserve-refresh-token",
        minRefreshIntervalMs: 5_000,
      },
    };
  }

  if (mode === "edge") {
    return {
      bridge: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      },
      session: {
        rotationPolicy: "require-refresh-token",
        minRefreshIntervalMs: 8_000,
      },
    };
  }

  return {
    bridge: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    },
    session: {
      rotationPolicy: "require-refresh-token",
      minRefreshIntervalMs: 10_000,
    },
  };
}

function reportPolicyOverride(
  onPolicyOverride: ((event: AuthKitPolicyOverrideEvent) => void | Promise<void>) | undefined,
  event: AuthKitPolicyOverrideEvent
): void {
  if (!onPolicyOverride) {
    return;
  }
  void onPolicyOverride(event);
}

/**
 * AuthKit alpha: one entrypoint that wires core auth and framework session integrations.
 */
export function createAuthKit(config: AuthKitConfig = {}): AuthKit {
  const defaultSessionStore = config.sessionStore;
  const mode = config.security?.mode ?? "ssr-bff";
  const preset = getSecurityPreset(mode);

  const bridge = {
    ...(config.bridge ?? {}),
    ...(config.bridge?.secure === undefined ? { secure: preset.bridge.secure } : {}),
    ...(config.bridge?.httpOnly === undefined ? { httpOnly: preset.bridge.httpOnly } : {}),
    ...(config.bridge?.sameSite === undefined ? { sameSite: preset.bridge.sameSite } : {}),
  };

  const session = {
    ...(config.session ?? {}),
    ...(config.session?.rotationPolicy === undefined ? { rotationPolicy: preset.session.rotationPolicy } : {}),
    ...(config.session?.minRefreshIntervalMs === undefined
      ? { minRefreshIntervalMs: preset.session.minRefreshIntervalMs }
      : {}),
  };

  if (config.bridge?.secure !== undefined && config.bridge.secure !== preset.bridge.secure) {
    reportPolicyOverride(config.security?.onPolicyOverride, {
      key: "bridge.secure",
      mode,
      recommended: preset.bridge.secure,
      actual: config.bridge.secure,
    });
  }
  if (config.bridge?.httpOnly !== undefined && config.bridge.httpOnly !== preset.bridge.httpOnly) {
    reportPolicyOverride(config.security?.onPolicyOverride, {
      key: "bridge.httpOnly",
      mode,
      recommended: preset.bridge.httpOnly,
      actual: config.bridge.httpOnly,
    });
  }
  if (config.bridge?.sameSite !== undefined && config.bridge.sameSite !== preset.bridge.sameSite) {
    reportPolicyOverride(config.security?.onPolicyOverride, {
      key: "bridge.sameSite",
      mode,
      recommended: preset.bridge.sameSite,
      actual: config.bridge.sameSite,
    });
  }
  if (config.session?.rotationPolicy !== undefined && config.session.rotationPolicy !== preset.session.rotationPolicy) {
    reportPolicyOverride(config.security?.onPolicyOverride, {
      key: "session.rotationPolicy",
      mode,
      recommended: preset.session.rotationPolicy,
      actual: config.session.rotationPolicy,
    });
  }
  if (
    config.session?.minRefreshIntervalMs !== undefined &&
    config.session.minRefreshIntervalMs !== preset.session.minRefreshIntervalMs
  ) {
    reportPolicyOverride(config.security?.onPolicyOverride, {
      key: "session.minRefreshIntervalMs",
      mode,
      recommended: preset.session.minRefreshIntervalMs,
      actual: config.session.minRefreshIntervalMs,
    });
  }

  const auth = createAuth({
    ...(config.providers !== undefined ? { providers: config.providers } : {}),
    ...(config.adapter !== undefined ? { adapter: config.adapter } : {}),
    ...(config.callbacks !== undefined ? { callbacks: config.callbacks } : {}),
    ...(config.secret !== undefined ? { secret: config.secret } : {}),
    session,
    ...(config.storage !== undefined ? { storage: config.storage } : {}),
    bridge,
    ...(config.debug !== undefined ? { debug: config.debug } : {}),
    ...(config.allowDangerousAccountLinking !== undefined
      ? { allowDangerousAccountLinking: config.allowDangerousAccountLinking }
      : {}),
  });

  const createSessionStore = (options?: AuthSessionStoreOptions): AuthSessionStore => {
    return createAuthSessionStore(auth.session, mergeSessionStoreOptions(defaultSessionStore, options));
  };

  return {
    auth,
    handlers: auth.handlers,
    createSessionStore,
    createReactHooks(useSyncExternalStore: ReactUseSyncExternalStore, options?: AuthSessionStoreOptions) {
      const sessionStore = createSessionStore(options);
      return createReactAuthHooks(sessionStore, useSyncExternalStore);
    },
    createVueSessionComposable(runtime: VueRuntimeBindings, options?: AuthSessionStoreOptions) {
      const sessionStore = createSessionStore(options);
      return createVueAuthSessionComposable(sessionStore, runtime);
    },
  };
}

export type { AuthKit, AuthKitConfig } from "../shared/index.js";
