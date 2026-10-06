/** Error reporting behind an interface; the Sentry adapter no-ops without a DSN. */
export interface ErrorReporter {
  capture(error: unknown, context?: Record<string, unknown>): void;
}

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

class SentryReporter implements ErrorReporter {
  private endpoint: string;
  private key: string;
  constructor(dsn: string) {
    const u = new URL(dsn);
    this.key = u.username;
    this.endpoint = `${u.protocol}//${u.host}/api/${u.pathname.replace("/", "")}/store/`;
  }
  capture(error: unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : new Error(String(error));
    fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${this.key}` },
      body: JSON.stringify({ platform: "javascript", level: "error", exception: { values: [{ type: err.name, value: err.message }] }, extra: { ...context, stack: err.stack } }),
    }).catch(() => {});
  }
}

class ConsoleReporter implements ErrorReporter {
  capture(error: unknown) {
    if (__DEV__) console.warn("[error]", error);
  }
}

export const errors: ErrorReporter = DSN ? new SentryReporter(DSN) : new ConsoleReporter();
