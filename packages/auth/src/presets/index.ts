import type { AuthBridge, AuthBridgeCookieOptions, AuthSessionManager, AuthSessionManagerOptions, AuthStore } from "../shared";
import { authMemoryStore } from "../storage";
import { createAuthBridge } from "../bridge";
import { createAuthSessionManager } from "../session";

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