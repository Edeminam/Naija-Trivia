import { env } from "../env";

/** Error reporting behind an interface; Sentry adapter no-ops without a DSN. */
export interface ErrorReporter {
  capture(error: unknown, context?: Record<string, unknown>): void;
}

class ConsoleReporter implements ErrorReporter {
  capture(error: unknown, context?: Record<string, unknown>) {
    if (!env.isTest) console.error("[error]", error, context ?? "");
  }
}

/** Minimal Sentry envelope sender (avoids pulling the full SDK into the game server). */
class SentryReporter implements ErrorReporter {
  private endpoint: string;
  private key: string;
  constructor(dsn: string) {
    const u = new URL(dsn);
    this.key = u.username;
    const projectId = u.pathname.replace("/", "");
    this.endpoint = `${u.protocol}//${u.host}/api/${projectId}/store/`;
  }
  capture(error: unknown, context?: Record<string, unknown>) {
    console.error("[error]", error);
    const err = error instanceof Error ? error : new Error(String(error));
    fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${this.key}` },
      body: JSON.stringify({
        platform: "node",
        level: "error",
        exception: { values: [{ type: err.name, value: err.message, stacktrace: { frames: [] } }] },
        extra: { ...context, stack: err.stack },
      }),
    }).catch(() => {});
  }
}

export const errors: ErrorReporter = env.sentryDsn ? new SentryReporter(env.sentryDsn) : new ConsoleReporter();
