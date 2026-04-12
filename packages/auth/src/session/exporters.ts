import type { AuthSessionEvent, AuthSessionEventAudit } from "../shared";

export interface SessionEventExporterOptions {
  readonly sink: (events: readonly AuthSessionEvent[]) => void | Promise<void>;
  readonly flushSize?: number;
}

export interface SessionEventBufferedExporter {
  readonly auditEvent: AuthSessionEventAudit;
  snapshot(): readonly AuthSessionEvent[];
  flush(): Promise<void>;
  clear(): void;
}

export function composeSessionEventAudits(...audits: readonly AuthSessionEventAudit[]): AuthSessionEventAudit {
  return async (event) => {
    for (const audit of audits) {
      await audit(event);
    }
  };
}

export function createConsoleSessionEventAudit(logger: Pick<Console, "info"> = console): AuthSessionEventAudit {
  return (event) => {
    logger.info("[pureq/auth/session]", {
      type: event.type,
      source: event.source,
      at: event.at,
      ...(event.reason !== undefined ? { reason: event.reason } : {}),
      ...(event.errorMessage !== undefined ? { errorMessage: event.errorMessage } : {}),
    });
  };
}

export function createBufferedSessionEventExporter(
  options: SessionEventExporterOptions
): SessionEventBufferedExporter {
  if (!options || typeof options.sink !== "function") {
    throw new Error("pureq: session event exporter requires a sink function");
  }

  const flushSize = options.flushSize ?? 20;
  if (!Number.isInteger(flushSize) || flushSize < 1) {
    throw new Error("pureq: session event exporter flushSize must be a positive integer");
  }

  const buffer: AuthSessionEvent[] = [];
  let flushing: Promise<void> | null = null;

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) {
      return;
    }

    const events = buffer.splice(0, buffer.length);
    await options.sink(events);
  };

  const flushSerial = async (): Promise<void> => {
    if (!flushing) {
      flushing = flush().finally(() => {
        flushing = null;
      });
    }
    await flushing;
  };

  return {
    auditEvent(event): void {
      buffer.push(event);
      if (buffer.length >= flushSize) {
        void flushSerial();
      }
    },

    snapshot(): readonly AuthSessionEvent[] {
      return buffer.slice();
    },

    async flush(): Promise<void> {
      await flushSerial();
    },

    clear(): void {
      buffer.splice(0, buffer.length);
    },
  };
}