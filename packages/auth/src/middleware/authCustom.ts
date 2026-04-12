import type { Middleware } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { AuthCustomOptions } from "../shared";
import { appendQueryParam, resolveStringValue } from "../shared";
import { mergeHeaders } from "./common";

export function authCustom(options: AuthCustomOptions): Middleware {
  const middleware: Middleware = async (req, next) => {
    let nextReq = req;

    if (options.header) {
      nextReq = mergeHeaders(nextReq, {
        [options.header.name]: await resolveStringValue(options.header.value),
      });
    }

    if (options.queryParam) {
      nextReq = {
        ...nextReq,
        url: appendQueryParam(nextReq.url, options.queryParam.name, await resolveStringValue(options.queryParam.value)),
      };
    }

    return next(nextReq);
  };

  return markPolicyMiddleware(middleware, { name: "authCustom", kind: "auth" });
}
