import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";
import { lagosDate, type OfflineDailyAnswer, type OfflineDailyPack, type OfflineDailyResult } from "@ntc/shared";
import { AsyncStorage } from "../../lib/storage";
import { api, ApiError } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";
import { getToken } from "../../stores/session";

/**
 * Offline Daily Naija. The pack (questions only — answers stay on the server) is downloaded while
 * online; answers are saved on the phone after every question and submitted when a connection returns.
 */
const KEY = "ntc.offlineDaily";

export interface OfflineRun {
  answers: OfflineDailyAnswer[];
  /** Index of the question on screen, and when it appeared (null between questions) */
  current: number;
  shownAt: number | null;
  finished: boolean;
}

interface Saved {
  pack: OfflineDailyPack | null;
  run: OfflineRun | null;
  /** Latest scored result, kept until the player has seen it */
  result: OfflineDailyResult | null;
}

interface OfflineDailyState extends Saved {
  hydrated: boolean;
  syncing: boolean;
  syncError: string | null;
}

export const useOfflineDaily = create<OfflineDailyState>(() => ({ pack: null, run: null, result: null, hydrated: false, syncing: false, syncError: null }));

const persist = () => {
  const { pack, run, result } = useOfflineDaily.getState();
  return AsyncStorage.setItem(KEY, JSON.stringify({ pack, run, result } satisfies Saved)).catch(() => {});
};

const update = async (patch: Partial<OfflineDailyState>) => {
  useOfflineDaily.setState(patch);
  await persist();
};

export async function hydrateOfflineDaily() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved: Saved = raw ? JSON.parse(raw) : { pack: null, run: null, result: null };
    useOfflineDaily.setState({ ...saved, hydrated: true });
  } catch {
    useOfflineDaily.setState({ hydrated: true });
  }
}

/** A downloaded pack for today that hasn't been finished yet. */
export const playableToday = (s: Pick<Saved, "pack" | "run">) => !!s.pack && s.pack.date === lagosDate() && !s.run?.finished;

/** Download today's 10 questions. Locks today's Daily to offline mode on the server. */
export async function downloadOfflineDaily() {
  const pack = await api.post<OfflineDailyPack>("/daily/offline");
  const { run, pack: old } = useOfflineDaily.getState();
  // Keep progress if this is a re-download of the same day's run.
  await update({ pack, run: old?.date === pack.date && run ? run : { answers: [], current: 0, shownAt: null, finished: false } });
  void queryClient.invalidateQueries({ queryKey: ["daily"] });
  return pack;
}

/**
 * Resume rule: if the app was closed while a question was on screen, that question counts as
 * unanswered — otherwise closing the app would be a free pause.
 */
export async function resumeOfflineRun(): Promise<OfflineRun | null> {
  const { run, pack } = useOfflineDaily.getState();
  if (!run || !pack || run.finished) return run;
  if (run.shownAt !== null) return recordOfflineAnswer(null);
  return run;
}

export async function markQuestionShown() {
  const { run } = useOfflineDaily.getState();
  if (!run || run.shownAt !== null) return;
  await update({ run: { ...run, shownAt: Date.now() } });
}

export async function recordOfflineAnswer(optionId: string | null): Promise<OfflineRun | null> {
  const { run, pack } = useOfflineDaily.getState();
  if (!run || !pack || run.finished) return run;
  const ms = run.shownAt !== null ? Date.now() - run.shownAt : pack.durationMs;
  const late = ms > pack.durationMs + 300;
  const answers = [...run.answers, { index: run.current, optionId: late ? null : optionId, ms: Math.min(ms, pack.durationMs) }];
  const next: OfflineRun = { answers, current: run.current + 1, shownAt: null, finished: run.current + 1 >= pack.questions.length };
  await update({ run: next });
  if (next.finished) void syncOfflineDaily();
  return next;
}

/** Submit a finished run if we're online. Safe to call any time. */
export async function syncOfflineDaily() {
  const s = useOfflineDaily.getState();
  if (s.syncing || !s.pack || !s.run?.finished || !getToken()) return;
  useOfflineDaily.setState({ syncing: true, syncError: null });
  try {
    const result = await api.post<OfflineDailyResult>("/daily/offline/submit", { date: s.pack.date, answers: s.run.answers });
    await update({ pack: null, run: null, result, syncing: false });
    void queryClient.invalidateQueries();
  } catch (e) {
    if (e instanceof ApiError && !e.offline && [404, 409, 410].includes(e.status)) {
      // Already submitted from elsewhere, or too old: nothing more we can do with it.
      await update({ pack: null, run: null, syncing: false, syncError: e.message });
      void queryClient.invalidateQueries({ queryKey: ["daily"] });
    } else {
      useOfflineDaily.setState({ syncing: false, syncError: e instanceof ApiError && e.offline ? null : (e as Error).message });
    }
  }
}

export const clearOfflineResult = () => update({ result: null, syncError: null });

void hydrateOfflineDaily().then(() => syncOfflineDaily());
NetInfo.addEventListener((s) => {
  if (s.isConnected) void syncOfflineDaily();
});
