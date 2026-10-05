import { env } from "../env";

/** Analytics behind an interface; PostHog adapter no-ops without a key. */
export interface AnalyticsService {
  track(userId: string, event: string, props?: Record<string, unknown>): void;
}

class NoopAnalytics implements AnalyticsService {
  track() {}
}

class PostHogAnalytics implements AnalyticsService {
  constructor(private key: string, private host = process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com") {}
  track(userId: string, event: string, props: Record<string, unknown> = {}) {
    fetch(`${this.host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: this.key, event, distinct_id: userId, properties: { ...props, $lib: "ntc-server" } }),
    }).catch(() => {});
  }
}

export const analytics: AnalyticsService = env.posthogKey ? new PostHogAnalytics(env.posthogKey) : new NoopAnalytics();
