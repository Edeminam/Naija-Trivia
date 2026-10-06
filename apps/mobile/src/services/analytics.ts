import { Platform } from "react-native";
import { useSession } from "../stores/session";

/** Analytics behind an interface; the PostHog adapter no-ops without a key. */
export interface AnalyticsService {
  track(event: string, props?: Record<string, unknown>): void;
  screen(name: string): void;
}

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

class PostHogAnalytics implements AnalyticsService {
  private queue: object[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  track(event: string, props: Record<string, unknown> = {}) {
    const distinct_id = useSession.getState().userId ?? "anonymous";
    this.queue.push({ event, distinct_id, properties: { ...props, $os: Platform.OS }, timestamp: new Date().toISOString() });
    if (!this.timer) this.timer = setTimeout(() => this.flush(), 4000);
  }
  screen(name: string) {
    this.track("$screen", { $screen_name: name });
  }
  private flush() {
    this.timer = null;
    const batch = this.queue.splice(0);
    if (!batch.length) return;
    fetch(`${HOST}/batch/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: KEY, batch }) }).catch(() => {});
  }
}

class NoopAnalytics implements AnalyticsService {
  track() {}
  screen() {}
}

export const analytics: AnalyticsService = KEY ? new PostHogAnalytics() : new NoopAnalytics();
