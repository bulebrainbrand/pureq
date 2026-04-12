export type {
	AuthStore,
	AuthBearerOptions,
	AuthRefreshOptions,
	TokenLifecycleOptions,
	AuthBasicOptions,
	AuthCustomOptions,
	BroadcastSyncOptions,
	OIDCFlow,
	OIDCFlowOptions,
	OIDCAuthorizationOptions,
	OIDCAuthorizationResult,
	OIDCTokenEndpointAuthMethod,
	OIDCProviderDefinition,
	OIDCCallbackParams,
	TokenResponse,
	AuthTokens,
	AuthSessionState,
	AuthSessionStatus,
	AuthSessionHookResult,
	AuthSessionManager,
	AuthSessionManagerOptions,
	AuthSessionEvent,
	AuthSessionEventAudit,
	AuthSessionEventExporter,
	AuthSessionEventListener,
	AuthTokenRotationPolicy,
	AuthSessionMiddlewareOptions,
	AuthCsrfOptions,
	AuthCsrfProtection,
	AuthRevocationClaims,
	AuthRevocationRegistry,
	AuthRevocationRegistryBackend,
	AuthRevocationGuardOptions,
	AuthBridge,
	AuthBridgeCookieOptions,
	AuthBridgeRequestLike,
	AuthFrameworkContext,
	AuthFrameworkContextOptions,
	AuthMappedHttpError,
	AuthRouteHandlerRecipe,
	AuthRouteHandlerRecipeOptions,
	AuthRequestAdapter,
	AuthRequestAdapterOptions,
	AuthServerActionFailure,
	AuthServerActionRecipe,
	AuthServerActionResult,
	AuthServerActionSuccess,
	AuthPreset,
	AuthPresetOptions,
	AuthSessionStore,
	AuthSessionStoreOptions,
	ReactAuthHooks,
	ReactUseSyncExternalStore,
	VueAuthSessionComposable,
	VueRuntimeBindings,
	AuthTemplateThreatModel,
	MultiTenantAuthPresetFactory,
	MultiTenantAuthPresetFactoryOptions,
	MultiTenantAuthTemplatePack,
	MultiTenantAuthTemplatePackOptions,
	SingleTenantAuthTemplate,
	SingleTenantAuthTemplateOptions,
	AuthLegacyTokenSnapshot,
	AuthMigrationResult,
	// New types
	AuthUser,
	AuthAccount,
	AuthPersistedSession,
	AuthVerificationToken,
	AuthDatabaseAdapter,
	AuthProvider,
	AuthCredentialsProviderOptions,
	AuthEmailProviderOptions,
	AuthCallbacks,
	AuthEncryption,
	AuthAuthorization,
	AuthAuthorizationOptions,
	AuthDebugLogger,
	AuthConfig,
	AuthInstance,
	AuthKit,
	AuthKitConfig,
	AuthRouteHandlers,
} from "./shared";
export {
	authMemoryStore,
	authLocalStorage,
	authSessionStorage,
	authCookieStore,
	authCustomStore,
	authHybridStore,
	authEncryptedStore,
} from "./storage/index";
export { authBearer, authRefresh, authSession, withTokenLifecycle, authBasic, authCustom, withBroadcastSync } from "./middleware/index";
export { decodeJwt, verifyJwt } from "./jwt/index";
export { createOIDCFlow, createOIDCFlowFromProvider, createOIDCflow, createOIDCflowFromProvider, parseOIDCCallbackParams, oidcProviders } from "./oidc/index";
export { createAuthError, buildAuthError } from "./shared";
export { createAuthCsrfProtection, withCsrfProtection } from "./csrf/index";
export { createAuthRevocationRegistry, withRevocationGuard } from "./revocation/index";
export { createAuthEventAdapter, composeAuthEventListeners } from "./events/index";
export { createAuthBridge } from "./bridge/index";
export { createAuthPreset } from "./presets/index";
export { createAuthRequestAdapter } from "./adapters/index";
export { createAuthFrameworkContext } from "./framework/index";
export { createAuthRouteHandlerRecipe, createAuthServerActionRecipe, mapAuthErrorToHttp } from "./framework/recipes";
export {
	createExpressAuthKitPack,
	createFastifyAuthKitPack,
	createNextAuthKitPack,
	createReactAuthKitBootstrapPack,
} from "./framework/packs";
export { createAuthSessionStore } from "./hooks/index";
export { createReactAuthHooks, createVueAuthSessionComposable } from "./hooks/index";
export { createMultiTenantAuthPresetFactory } from "./templates/index";
export { createSingleTenantAuthTemplate, createMultiTenantAuthTemplatePack } from "./templates/index";
export {
	normalizeLegacyAuthTokens,
	migrateLegacyTokensToStore,
	hydrateSessionManagerFromLegacy,
	analyzeAuthMigration,
	formatMigrationParityReport,
	generateMigrationChecklists,
} from "./migration/index";
export {
	createAuthSessionManager,
	composeSessionEventAudits,
	createConsoleSessionEventAudit,
	createBufferedSessionEventExporter,
} from "./session/index";
export type { SessionEventBufferedExporter, SessionEventExporterOptions } from "./session/index";
export type { AuthEventAdapter, AuthEventAdapterOptions } from "./events/index";

// New module exports
export {
	createInMemoryAdapter,
	createMySqlAdapter,
	createMySqlExecutor,
	createPostgresAdapter,
	createPostgresExecutor,
	createSqlAdapter,
	getSqlSchemaStatements,
	probeAdapterCapabilities,
	assessAdapterReadiness,
} from "./adapter/index";
export type {
	AdapterCapabilityReport,
	AdapterReadinessOptions,
	AdapterReadinessReport,
	MySqlClientLike,
	PostgresClientLike,
	SqlAdapterOptions,
	SqlDialect,
	SqlExecutor,
	SqlRow,
	SqlValue,
	TableNames,
} from "./adapter/index";
export {
	credentialsProvider,
	emailProvider,
	createTopProviderPreset,
	listTopProviderPresets,
	validateProviderCallbackContract,
	normalizeProviderError,
	PROVIDER_ERROR_NORMALIZATION_TABLE,
} from "./providers/index";
export type {
	TopProviderPreset,
	TopProviderPresetOptions,
	ProviderCallbackContractInput,
	ProviderCallbackContractResult,
	ProviderNormalizedError,
} from "./providers/index";
export { composeAuthCallbacks } from "./callbacks/index";
export { createAuthEncryption } from "./encryption/index";
export { createAuthorization } from "./authorization/index";
export { createAuthDebugLogger } from "./debug/index";
export { createAuth } from "./core/index";
export { createAuthKit } from "./core/kit";
export { createAuthStarter } from "./core/starter";
export type { AuthStarter, AuthStarterConfig } from "./core/starter";
