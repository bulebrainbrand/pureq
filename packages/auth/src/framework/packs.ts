import type { AuthKit, ReactAuthHooks, ReactUseSyncExternalStore } from "../shared";

type RouteRequestLike = {
  readonly method?: string;
  readonly url?: string;
  readonly headers?: Headers | Readonly<Record<string, string | null | undefined>>;
  readonly body?: unknown;
};

type ExpressLikeRequest = {
  readonly method?: string;
  readonly originalUrl?: string;
  readonly url?: string;
  readonly headers?: Readonly<Record<string, string | null | undefined>>;
  readonly body?: unknown;
};

type ExpressLikeResponse = {
  status(code: number): ExpressLikeResponse;
  setHeader(name: string, value: string | readonly string[]): void;
  json(value: unknown): void;
};

type FastifyLikeRequest = {
  readonly method?: string;
  readonly url?: string;
  readonly headers?: Readonly<Record<string, string | null | undefined>>;
  readonly body?: unknown;
};

type FastifyLikeReply = {
  code(statusCode: number): FastifyLikeReply;
  header(name: string, value: string | readonly string[]): FastifyLikeReply;
  send(payload: unknown): void;
};

async function responseToJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function setSetCookieToExpress(response: Response, res: ExpressLikeResponse): void {
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    res.setHeader("Set-Cookie", setCookie);
  }
}

function setSetCookieToFastify(response: Response, reply: FastifyLikeReply): void {
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    reply.header("Set-Cookie", setCookie);
  }
}

function toRouteRequestLike(request: RouteRequestLike, fallbackMethod?: string): RouteRequestLike {
  return {
    ...(fallbackMethod ? { method: fallbackMethod } : {}),
    ...(request.method ? { method: request.method } : {}),
    ...(request.url ? { url: request.url } : {}),
    ...(request.headers ? { headers: request.headers } : {}),
    ...(request.body !== undefined ? { body: request.body } : {}),
  };
}

export function createNextAuthKitPack(kit: AuthKit) {
  return {
    providers: (request: RouteRequestLike = {}) => kit.handlers.handleSignIn(toRouteRequestLike(request, "GET")),
    signIn: (request: RouteRequestLike) => kit.handlers.handleSignIn(toRouteRequestLike(request, "POST")),
    callback: (request: RouteRequestLike) => kit.handlers.handleCallback(toRouteRequestLike(request)),
    session: (request: RouteRequestLike) => kit.handlers.handleSession(toRouteRequestLike(request)),
    signOut: (request: RouteRequestLike) => kit.handlers.handleSignOut(toRouteRequestLike(request)),
  };
}

export function createExpressAuthKitPack(kit: AuthKit) {
  return {
    providers: async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
      const response = await kit.handlers.handleSignIn(
        toRouteRequestLike(
          {
            ...((req.originalUrl ?? req.url) ? { url: req.originalUrl ?? req.url } : {}),
            ...(req.headers ? { headers: req.headers } : {}),
          },
          "GET"
        )
      );
      setSetCookieToExpress(response, res);
      res.status(response.status).json(await responseToJson(response));
    },
    signIn: async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
      const response = await kit.handlers.handleSignIn(
        toRouteRequestLike(
          {
            ...((req.originalUrl ?? req.url) ? { url: req.originalUrl ?? req.url } : {}),
            ...(req.headers ? { headers: req.headers } : {}),
            ...(req.body !== undefined ? { body: req.body } : {}),
          },
          "POST"
        )
      );
      setSetCookieToExpress(response, res);
      res.status(response.status).json(await responseToJson(response));
    },
    callback: async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
      const response = await kit.handlers.handleCallback(
        toRouteRequestLike({
          ...((req.originalUrl ?? req.url) ? { url: req.originalUrl ?? req.url } : {}),
          ...(req.headers ? { headers: req.headers } : {}),
        })
      );
      setSetCookieToExpress(response, res);
      res.status(response.status).json(await responseToJson(response));
    },
    session: async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
      const response = await kit.handlers.handleSession(toRouteRequestLike(req.headers ? { headers: req.headers } : {}));
      setSetCookieToExpress(response, res);
      res.status(response.status).json(await responseToJson(response));
    },
    signOut: async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
      const response = await kit.handlers.handleSignOut(toRouteRequestLike(req.headers ? { headers: req.headers } : {}));
      setSetCookieToExpress(response, res);
      res.status(response.status).json(await responseToJson(response));
    },
  };
}

export function createFastifyAuthKitPack(kit: AuthKit) {
  return {
    providers: async (req: FastifyLikeRequest, reply: FastifyLikeReply) => {
      const response = await kit.handlers.handleSignIn(
        toRouteRequestLike(
          {
            ...(req.url ? { url: req.url } : {}),
            ...(req.headers ? { headers: req.headers } : {}),
          },
          "GET"
        )
      );
      setSetCookieToFastify(response, reply);
      reply.code(response.status).send(await responseToJson(response));
    },
    signIn: async (req: FastifyLikeRequest, reply: FastifyLikeReply) => {
      const response = await kit.handlers.handleSignIn(
        toRouteRequestLike(
          {
            ...(req.url ? { url: req.url } : {}),
            ...(req.headers ? { headers: req.headers } : {}),
            ...(req.body !== undefined ? { body: req.body } : {}),
          },
          "POST"
        )
      );
      setSetCookieToFastify(response, reply);
      reply.code(response.status).send(await responseToJson(response));
    },
    callback: async (req: FastifyLikeRequest, reply: FastifyLikeReply) => {
      const response = await kit.handlers.handleCallback(
        toRouteRequestLike({
          ...(req.url ? { url: req.url } : {}),
          ...(req.headers ? { headers: req.headers } : {}),
        })
      );
      setSetCookieToFastify(response, reply);
      reply.code(response.status).send(await responseToJson(response));
    },
    session: async (req: FastifyLikeRequest, reply: FastifyLikeReply) => {
      const response = await kit.handlers.handleSession(toRouteRequestLike(req.headers ? { headers: req.headers } : {}));
      setSetCookieToFastify(response, reply);
      reply.code(response.status).send(await responseToJson(response));
    },
    signOut: async (req: FastifyLikeRequest, reply: FastifyLikeReply) => {
      const response = await kit.handlers.handleSignOut(toRouteRequestLike(req.headers ? { headers: req.headers } : {}));
      setSetCookieToFastify(response, reply);
      reply.code(response.status).send(await responseToJson(response));
    },
  };
}

export function createReactAuthKitBootstrapPack(
  kit: AuthKit,
  useSyncExternalStore: ReactUseSyncExternalStore
): ReactAuthHooks {
  return kit.createReactHooks(useSyncExternalStore);
}
