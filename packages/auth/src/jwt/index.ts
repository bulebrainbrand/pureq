import { base64UrlDecode } from "../shared/index.js";

function parseSegment<T>(segment: string): T {
  const text = new TextDecoder().decode(base64UrlDecode(segment));
  return JSON.parse(text) as T;
}

/** Decode a JWT payload without signature verification. */
export function decodeJwt<T = unknown>(token: string): T {
  const segments = token.split(".");
  if (segments.length < 2 || !segments[1]) {
    throw new Error("pureq: invalid JWT format");
  }

  return parseSegment<T>(segments[1]);
}

const SUPPORTED_ALGORITHMS = ["HS256", "RS256", "ES256"] as const;
type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

function isSupportedAlgorithm(alg: string): alg is SupportedAlgorithm {
  return (SUPPORTED_ALGORITHMS as readonly string[]).includes(alg);
}

function algorithmParams(alg: SupportedAlgorithm): AlgorithmIdentifier {
  switch (alg) {
    case "HS256":
      return { name: "HMAC", hash: "SHA-256" } as HmacImportParams;
    case "RS256":
      return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as RsaHashedImportParams;
    case "ES256":
      return { name: "ECDSA", namedCurve: "P-256" } as EcKeyImportParams;
  }
}

function verifyAlgorithmParams(alg: SupportedAlgorithm): AlgorithmIdentifier {
  if (alg === "ES256") {
    return { name: "ECDSA", hash: "SHA-256" } as EcdsaParams;
  }
  return algorithmParams(alg);
}

/**
 * Verify a JWT signature and return the decoded payload.
 *
 * @param token - The JWT string to verify.
 * @param keyOrSecret - HMAC secret string, CryptoKey, or raw key bytes.
 * @param options - Must include `algorithms` to prevent algorithm confusion attacks.
 */
export async function verifyJwt<T = unknown>(
  token: string,
  keyOrSecret: string | CryptoKey | ArrayBuffer | Uint8Array,
  options: { readonly algorithms: readonly string[] }
): Promise<T> {
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment) {
    throw new Error("pureq: invalid JWT format");
  }

  const header = parseSegment<{ readonly alg?: string }>(headerSegment);
  const alg = header.alg ?? "";

  // SEC-C1: Reject alg: "none" unconditionally
  if (alg === "none" || alg === "") {
    throw new Error("pureq: JWT algorithm \"none\" is not permitted");
  }

  if (!signatureSegment) {
    throw new Error("pureq: invalid JWT format");
  }

  // SEC-C2: Reject algorithms not in the caller's allowlist
  if (!options.algorithms.includes(alg)) {
    throw new Error(`pureq: unsupported JWT algorithm ${alg}`);
  }

  if (!isSupportedAlgorithm(alg)) {
    throw new Error(`pureq: JWT verification is not implemented for algorithm ${alg}`);
  }

  const unsigned = `${headerSegment}.${payloadSegment}`;
  const encoder = new TextEncoder();
  const signature = base64UrlDecode(signatureSegment);

  let key: CryptoKey;

  if (keyOrSecret instanceof CryptoKey) {
    key = keyOrSecret;
  } else if (typeof keyOrSecret === "string") {
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(keyOrSecret),
      algorithmParams(alg),
      false,
      ["verify"]
    );
  } else {
    const rawBytes = keyOrSecret instanceof ArrayBuffer ? new Uint8Array(keyOrSecret) : keyOrSecret;
    key = await crypto.subtle.importKey(
      "raw",
      rawBytes as any,
      algorithmParams(alg),
      false,
      ["verify"]
    );
  }

  const verified = await crypto.subtle.verify(
    verifyAlgorithmParams(alg),
    key,
    signature as any,
    encoder.encode(unsigned) as any
  );

  if (!verified) {
    throw new Error("pureq: JWT signature verification failed");
  }

  return parseSegment<T>(payloadSegment);
}
