import type { AuthBridge, AuthBridgeCookieOptions, AuthSessionManager, AuthSessionManagerOptions, AuthStore } from "../shared/index.js";
import { authMemoryStore } from "../storage/index.js";
import { createAuthBridge } from "../bridge/index.js";
import { createAuthSessionManager } from "../session/index.js";

export interface AuthPresetOptions {
  readonly storage?: AuthStore;
  readonly session?: AuthSessionManagerOptions;
  readonly bridge?: AuthBridgeCookieOptions;
}

export interface AuthPreset {
  readonly storage: AuthStore;
  readonly session: AuthSessionManager;
  readonly bridge: AuthBridge;
}

export function createAuthPreset(options: AuthPresetOptions = {}): AuthPreset {
  const storage = options.storage ?? authMemoryStore();

  return {
    storage,
    session: createAuthSessionManager(storage, options.session),
    bridge: createAuthBridge(options.bridge),
  };
}