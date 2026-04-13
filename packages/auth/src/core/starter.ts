import type {
  AuthFrameworkContext,
  AuthFrameworkContextOptions,
  AuthKit,
  AuthKitConfig,
  AuthRequestAdapter,
  AuthRouteHandlerRecipe,
  AuthServerActionRecipe,
  AuthSessionStore,
  AuthSessionStoreOptions,
  ReactAuthHooks,
  ReactUseSyncExternalStore,
  VueAuthSessionComposable,
  VueRuntimeBindings,
} from "../shared/index.js";
import { assessAdapterReadiness } from "../adapter/index.js";
import type { AdapterReadinessReport } from "../adapter/index.js";
import { createAuthRequestAdapter } from "../adapters/index.js";
import { createAuthFrameworkContext } from "../framework/index.js";
import { createAuthRouteHandlerRecipe, createAuthServerActionRecipe } from "../framework/recipes.js";
import { createAuthError } from "../shared/index.js";
import { authMemoryStore } from "../storage/index.js";
import { createAuthKit } from "./kit.js";

function mergeSessionStoreOptions(
  base: AuthSessionStoreOptions | undefined,
  next: AuthSessionStoreOptions | undefined
): AuthSessionStoreOptions {
  return {
    ...(base ?? {}),
    ...(next ?? {}),
  };
}

export interface AuthStarterConfig extends AuthKitConfig, AuthFrameworkContextOptions {
  readonly sessionStore?: AuthSessionStoreOptions;
  readonly adapterReadiness?: {
    readonly deployment?: "development" | "production";
    readonly requireEmailProviderSupport?: boolean;
    readonly failOnNeedsAttention?: boolean;
    readonly onReport?: (report: AdapterReadinessReport) => void;
  };
}

export interface AuthStarter {
  readonly kit: AuthKit;
  readonly request: AuthRequestAdapter;
  readonly context: AuthFrameworkContext;
  readonly route: AuthRouteHandlerRecipe;
  readonly action: AuthServerActionRecipe;
  readonly adapterReadiness?: AdapterReadinessReport;
  createSessionStore(options?: AuthSessionStoreOptions): AuthSessionStore;
  createReactHooks(useSyncExternalStore: ReactUseSyncExternalStore, options?: AuthSessionStoreOptions): ReactAuthHooks;
  createVueSessionComposable(runtime: VueRuntimeBindings, options?: AuthSessionStoreOptions): () => VueAuthSessionComposable;
}

/**
 * Convenience starter for the smallest supported end-to-end auth setup.
 * It keeps the golden path in one place without hiding the lower-level primitives.
 */
export async function createAuthStarter(config: AuthStarterConfig = {}): Promise<AuthStarter> {
  const sharedStorage = config.storage ?? authMemoryStore();
  const starterConfig: AuthStarterConfig = {
    ...config,
    storage: sharedStorage,
  };

  const kit = createAuthKit(starterConfig);
  const request = createAuthRequestAdapter(starterConfig);
  const context = await createAuthFrameworkContext(starterConfig);
  const route = createAuthRouteHandlerRecipe(context);
  const action = createAuthServerActionRecipe(context);
  const defaultSessionStore = config.sessionStore;
  let adapterReadiness: AdapterReadinessReport | undefined;

  if (starterConfig.adapter) {
    adapterReadiness = assessAdapterReadiness(starterConfig.adapter, {
      ...(starterConfig.adapterReadiness?.deployment !== undefined
        ? { deployment: starterConfig.adapterReadiness.deployment }
        : {}),
      ...(starterConfig.adapterReadiness?.requireEmailProviderSupport !== undefined
        ? { requireEmailProviderSupport: starterConfig.adapterReadiness.requireEmailProviderSupport }
        : {}),
    });

    starterConfig.adapterReadiness?.onReport?.(adapterReadiness);

    if (adapterReadiness.status === "blocked") {
      throw createAuthError(
        "PUREQ_ADAPTER_NOT_READY",
        `pureq: adapter is blocked for starter (${adapterReadiness.blockers.join("; ")})`
      );
    }

    if (adapterReadiness.status === "needs-attention" && starterConfig.adapterReadiness?.failOnNeedsAttention) {
      throw createAuthError(
        "PUREQ_ADAPTER_NEEDS_ATTENTION",
        `pureq: adapter needs attention for starter (${adapterReadiness.warnings.join("; ")})`
      );
    }
  }

  const createSessionStore = (options?: AuthSessionStoreOptions): AuthSessionStore => {
    return kit.createSessionStore(mergeSessionStoreOptions(defaultSessionStore, options));
  };

  return {
    kit,
    request,
    context,
    route,
    action,
    ...(adapterReadiness !== undefined ? { adapterReadiness } : {}),
    createSessionStore,
    createReactHooks(useSyncExternalStore: ReactUseSyncExternalStore, options?: AuthSessionStoreOptions): ReactAuthHooks {
      return kit.createReactHooks(useSyncExternalStore, mergeSessionStoreOptions(defaultSessionStore, options));
    },
    createVueSessionComposable(runtime: VueRuntimeBindings, options?: AuthSessionStoreOptions): () => VueAuthSessionComposable {
      return kit.createVueSessionComposable(runtime, mergeSessionStoreOptions(defaultSessionStore, options));
    },
  };
}