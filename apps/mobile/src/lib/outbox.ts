import NetInfo from "@react-native-community/netinfo";
import { AsyncStorage } from "./storage";
import { api, ApiError } from "./api";

/**
 * Queue for non-critical writes (reports, settings) made while offline.
 * Flushed when connectivity returns. Game-critical actions are never queued.
 */
const KEY = "ntc.outbox";
type Job = { method: "post" | "patch"; path: string; body: unknown; at: number };

async function load(): Promise<Job[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}
const save = (jobs: Job[]) => AsyncStorage.setItem(KEY, JSON.stringify(jobs.slice(-50))).catch(() => {});

export async function sendOrQueue(method: Job["method"], path: string, body: unknown) {
  try {
    return await api[method](path, body);
  } catch (e) {
    if (e instanceof ApiError && e.offline) {
      await save([...(await load()), { method, path, body, at: Date.now() }]);
      return { queued: true };
    }
    throw e;
  }
}

let flushing = false;
export async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    const jobs = await load();
    const left: Job[] = [];
    for (const j of jobs) {
      try {
        await api[j.method](j.path, j.body);
      } catch (e) {
        if (e instanceof ApiError && e.offline) left.push(j);
      }
    }
    await save(left);
  } finally {
    flushing = false;
  }
}

NetInfo.addEventListener((s) => {
  if (s.isConnected) void flushOutbox();
});
