import type { RequestConfig } from "@pureq/pureq";

export function mergeHeaders(req: RequestConfig, headers: Readonly<Record<string, string>>): RequestConfig {
  return {
    ...req,
    headers: {
      ...req.headers,
      ...headers,
    },
  };
}
