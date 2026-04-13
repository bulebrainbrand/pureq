import { parseOIDCCallbackParams } from "../oidc/index.js";
import { createAuthError } from "../shared/index.js";

export interface ProviderCallbackContractInput {
  readonly provider: string;
  readonly callback: string | URL | URLSearchParams;
  readonly expectedState?: string;
  readonly requireCodeVerifier?: boolean;
  readonly codeVerifier?: string | null;
}

export interface ProviderCallbackContractResult {
  readonly provider: string;
  readonly code: string;
  readonly state?: string;
}

export function validateProviderCallbackContract(input: ProviderCallbackContractInput): ProviderCallbackContractResult {
  const parsed = parseOIDCCallbackParams(input.callback, input.expectedState);

  if (input.requireCodeVerifier && (!input.codeVerifier || !input.codeVerifier.trim())) {
    throw createAuthError(
      "PUREQ_AUTH_MISSING_TOKEN",
      "pureq: callback contract requires codeVerifier",
      { details: { provider: input.provider } }
    );
  }

  return {
    provider: input.provider,
    code: parsed.code,
    ...(parsed.state !== undefined ? { state: parsed.state } : {}),
  };
}
