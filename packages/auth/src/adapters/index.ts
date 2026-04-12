import type {
  AuthBridge,
  AuthPreset,
  AuthRequestAdapter,
  AuthRequestAdapterOptions,
  AuthSessionManager,
  AuthSessionState,
  AuthStore,
} from "../shared";
import { createAuthPreset } from "../presets";

function appendSetCookieHeaders(headers: Headers, values: readonly string[]): void {
  for (const value of values) {
    headers.append("Set-Cookie", value);
  }
}

export function createAuthRequestAdapter(options: AuthRequestAdapterOptions = {}): AuthRequestAdapter {
  const preset = createAuthPreset(options);
  const defaultRequest = options.request ?? {};

  const readSession = (request: Parameters<AuthBridge["readSession"]>[0] = defaultRequest): AuthSessionState => {
    return preset.bridge.readSession(request);
  };

  const bootstrap = async (request: Parameters<AuthBridge["hydrateSessionManager"]>[1] = defaultRequest): Promise<AuthSessionState> => {
    return preset.bridge.hydrateSessionManager(preset.session, request);
  };

  const buildSetCookieHeaders = (session: AuthSessionState): readonly string[] => {
    return preset.bridge.buildSetCookieHeaders(session);
  };

  const buildResponseHeaders = (session: AuthSessionState, headers?: HeadersInit): Headers => {
    const result = new Headers(headers);
    appendSetCookieHeaders(result, buildSetCookieHeaders(session));
    return result;
  };

  const buildResponseInit = (session: AuthSessionState, init: ResponseInit = {}): ResponseInit => {
    return {
      ...init,
      headers: buildResponseHeaders(session, init.headers),
    };
  };

  return {
    preset,
    storage: preset.storage,
    session: preset.session,
    bridge: preset.bridge,
    readSession,
    bootstrap,
    buildSetCookieHeaders,
    buildResponseHeaders,
    buildResponseInit,
  };
}

export type { AuthBridge, AuthPreset, AuthRequestAdapter, AuthRequestAdapterOptions, AuthSessionManager, AuthSessionState, AuthStore } from "../shared";
