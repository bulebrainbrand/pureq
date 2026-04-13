import type { Middleware } from "@pureq/pureq";
import { markPolicyMiddleware } from "@pureq/pureq";
import type { BroadcastSyncOptions } from "../shared/index.js";

/** DX-L1: BroadcastSync with dispose support. */
export function withBroadcastSync(options: BroadcastSyncOptions): Middleware & { dispose(): void } {
  const channelName = options.channel ?? "auth:token";
  let initialized = false;
  let channel: BroadcastChannel | null = null;

  const initialize = (): void => {
    if (initialized || typeof BroadcastChannel !== "function") {
      initialized = true;
      return;
    }

    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => {
      const token = typeof event.data === "string" ? event.data : event.data?.token;
      if (typeof token === "string" && token.length > 0) {
        void options.onRemoteRefresh(token);
      }
    };
    initialized = true;
  };

  const middleware: Middleware = async (req, next) => {
    initialize();
    return next(req);
  };

  const marked = markPolicyMiddleware(middleware, { name: "withBroadcastSync", kind: "auth" });

  return Object.assign(marked, {
    dispose(): void {
      if (channel) {
        channel.onmessage = null;
        channel.close();
        channel = null;
      }
    },
  });
}
