# Error Code Reference

このページは、実装上で実際に送出されるエラーコードのみを列挙します。

## Auth Codes

- PUREQ_AUTH_MISSING_TOKEN
  - 発生箇所: authBearer, authSession
  - 意味: 要求された認証トークンが存在しない

- PUREQ_AUTH_INVALID_TOKEN
  - 発生箇所: authBearer, tokenLifecycle
  - 意味: トークンが不正、または検証に失敗

- PUREQ_AUTH_REFRESH_FAILED
  - 発生箇所: authRefresh, authSession, tokenLifecycle
  - 意味: リフレッシュ処理が失敗

- PUREQ_AUTH_UNAUTHORIZED
  - 発生箇所: authRefresh
  - 意味: リフレッシュ再試行ループが終了し、認証継続不可

- PUREQ_AUTH_EXPIRED
  - 発生箇所: tokenLifecycle
  - 意味: トークン期限切れ

- PUREQ_AUTH_CSRF_INVALID_TOKEN
  - 発生箇所: createAuthCsrfProtection.issueToken
  - 意味: CSRF トークン生成結果が空

- PUREQ_AUTH_CSRF_FAILED
  - 発生箇所: createAuthCsrfProtection.middleware
  - 意味: CSRF 検証失敗

- PUREQ_AUTH_REVOKED
  - 発生箇所: withRevocationGuard
  - 意味: トークン/セッション/サブジェクトが失効済み

## OIDC Codes

- PUREQ_OIDC_INVALID_CONFIGURATION
  - 発生箇所: createOIDCflow
  - 意味: clientId/discoveryUrl/redirectUri が不正

- PUREQ_OIDC_DISCOVERY_FAILED
  - 発生箇所: fetchMetadata
  - 意味: Discovery ドキュメント取得失敗

- PUREQ_OIDC_INVALID_DISCOVERY_DOCUMENT
  - 発生箇所: fetchMetadata
  - 意味: Discovery ドキュメントに必須項目がない

- PUREQ_OIDC_CALLBACK_ERROR
  - 発生箇所: parseOIDCCallbackParams
  - 意味: OIDC コールバックに error パラメータ

- PUREQ_OIDC_MISSING_CODE
  - 発生箇所: parseOIDCCallbackParams
  - 意味: コールバックに authorization code がない

- PUREQ_OIDC_STATE_MISMATCH
  - 発生箇所: parseOIDCCallbackParams
  - 意味: state 検証失敗

- PUREQ_OIDC_INVALID_TOKEN_RESPONSE
  - 発生箇所: toTokenResponse
  - 意味: token endpoint レスポンスに access_token がない

- PUREQ_OIDC_TOKEN_EXCHANGE_FAILED
  - 発生箇所: exchangeCode
  - 意味: authorization code 交換失敗

- PUREQ_OIDC_TOKEN_REFRESH_FAILED
  - 発生箇所: refresh
  - 意味: refresh_token 交換失敗

- PUREQ_OIDC_INVALID_PROVIDER
  - 発生箇所: createOIDCflowFromProvider, oidcProviders
  - 意味: provider 定義が不正
