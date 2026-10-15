import { create } from "zustand";
import type { Client, Room } from "@colyseus/sdk";
import type { QuestionMsg, RevealMsg, ResultMsg, PowerUpKind, CategorySlug, LeagueId } from "@ntc/shared";
import { WS_URL } from "../../lib/config";
import { getToken } from "../../stores/session";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { queryClient } from "../../lib/queryClient";
import { analytics } from "../../services/analytics";
import { errors } from "../../services/errors";

export interface PlayerView {
  id: string;
  username: string;
  avatarId: string;
  stateCode: string;
  rating: number;
  league: LeagueId;
  level: number;
  frameId: string;
  isBot: boolean;
  score: number;
  answered: boolean;
  connected: boolean;
  banned: string;
  powerUpUsed: boolean;
}

export type Stage = "idle" | "searching" | "found" | "banning" | "ready" | "intro" | "question" | "reveal" | "result" | "error";

export interface BanOptionView {
  categoryId: string;
  slug: CategorySlug;
  name: string;
}

interface MatchStore {
  stage: Stage;
  mode: "ranked" | "guest";
  me: string | null;
  players: Record<string, PlayerView>;
  /** server clock − local clock */
  offset: number;
  searchStartedAt: number;
  window: number;
  banOptions: BanOptionView[];
  banDeadline: number;
  myBan: string | null;
  categories: CategorySlug[];
  round: number;
  total: number;
  doubleIntro: boolean;
  question: (QuestionMsg & { localDeadline: number; hidden?: string[] }) | null;
  myAnswer: string | null;
  reveal: RevealMsg | null;
  powerUp: { kind: PowerUpKind; removeOptionIds?: string[]; distribution?: Record<string, number> } | null;
  powerUpPending: PowerUpKind | null;
  result: ResultMsg | null;
  reconnecting: boolean;
  connectionLost: boolean;
  error: string | null;
  rematch: { requested: string[]; opponentLeft: boolean; waiting: boolean };
  isBot: boolean;
}

const initial = (): Omit<MatchStore, "mode"> => ({
  stage: "idle",
  me: null,
  players: {},
  offset: 0,
  searchStartedAt: 0,
  window: 100,
  banOptions: [],
  banDeadline: 0,
  myBan: null,
  categories: [],
  round: 0,
  total: 7,
  doubleIntro: false,
  question: null,
  myAnswer: null,
  reveal: null,
  powerUp: null,
  powerUpPending: null,
  result: null,
  reconnecting: false,
  connectionLost: false,
  error: null,
  rematch: { requested: [], opponentLeft: false, waiting: false },
  isBot: false,
});

export const useMatch = create<MatchStore>(() => ({ ...initial(), mode: "ranked" }));

let client: Client | null = null;
let queueRoom: Room | null = null;
let room: Room | null = null;
let generation = 0;

const set = (patch: Partial<MatchStore>) => useMatch.setState(patch);
const toLocal = (serverTs: number) => serverTs - useMatch.getState().offset;
const syncClock = (serverNow: number) => set({ offset: serverNow - Date.now() });

/** The realtime client is loaded on first use so it stays out of the start-up bundle on web. */
async function getClient() {
  if (!client) {
    const { Client } = await import("@colyseus/sdk");
    client ??= new Client(WS_URL);
  }
  client.auth.token = getToken() ?? "";
  return client;
}

function snapshot(state: any) {
  const players: Record<string, PlayerView> = {};
  state.players?.forEach((p: any, id: string) => {
    players[id] = { ...(p.toJSON ? p.toJSON() : p) };
  });
  set({ players, isBot: !!state.isBot, total: state.total ?? 7 });
}

function wireRoom(r: Room, gen: number) {
  r.reconnection.maxRetries = 12;
  r.reconnection.minDelay = 250;
  r.reconnection.maxDelay = 3000;
  r.onStateChange((s: any) => gen === generation && snapshot(s));
  r.onMessage("hello", (m: { you: string; serverNow: number }) => {
    syncClock(m.serverNow);
    set({ me: m.you });
  });
  r.onMessage("phase", (m: any) => {
    if (m.serverNow) syncClock(m.serverNow);
    if (m.phase === "banning") set({ stage: "banning", banOptions: m.options, banDeadline: toLocal(m.deadlineAt), myBan: null });
    if (m.phase === "ready") set({ stage: "ready", categories: m.categories });
  });
  r.onMessage("roundIntro", (m: { round: number; total: number }) => set({ stage: "intro", round: m.round, total: m.total, doubleIntro: false, reveal: null }));
  r.onMessage("doubleWahala", (m: { round: number }) => {
    set({ stage: "intro", round: m.round, doubleIntro: true, reveal: null });
    haptic.medium();
    sfx.play("wahala");
  });
  r.onMessage("question", (q: QuestionMsg & { hidden?: string[] }) => {
    syncClock(q.serverNow);
    set({ stage: "question", question: { ...q, localDeadline: toLocal(q.deadlineAt) }, round: q.round, total: q.total, myAnswer: null, reveal: null, powerUp: q.hidden ? { kind: "fifty", removeOptionIds: q.hidden } : null });
  });
  r.onMessage("reveal", (m: RevealMsg) => {
    const me = useMatch.getState().me;
    const mine = me ? m.answers[me] : undefined;
    set({ stage: "reveal", reveal: m });
    if (mine?.correct) {
      haptic.success();
      sfx.play("correct");
    } else {
      haptic.error();
      sfx.play("wrong");
    }
  });
  r.onMessage("powerup", (m: any) => {
    const q = useMatch.getState().question;
    if (m.kind === "extra_time" && q && m.deadlineAt) set({ question: { ...q, localDeadline: toLocal(m.deadlineAt), deadlineAt: m.deadlineAt } });
    set({ powerUp: m, powerUpPending: null });
    if (m.coins != null) queryClient.setQueryData(["me"], (old: any) => (old ? { ...old, profile: { ...old.profile, coins: m.coins } } : old));
    haptic.medium();
  });
  r.onMessage("powerupError", (m: { reason: string }) => set({ powerUpPending: null, error: m.reason }));
  r.onMessage("answerRejected", () => set({ error: "Too late — that answer missed the buzzer." }));
  r.onMessage("result", (m: ResultMsg) => {
    set({ stage: "result", result: m });
    const me = useMatch.getState().me;
    const res = me ? m.players[me]?.result : undefined;
    if (res === "win") sfx.play("win");
    analytics.track("match_result", { result: res, isBot: m.isBot });
    void queryClient.invalidateQueries();
  });
  r.onMessage("matchError", (m: { message: string }) => set({ stage: "error", error: m.message }));
  r.onMessage("rematchStatus", (m: { requested: string[]; opponentLeft: boolean }) => set({ rematch: { ...useMatch.getState().rematch, requested: m.requested, opponentLeft: m.opponentLeft } }));
  r.onMessage("rematchReady", async (m: { reservation: any }) => {
    const mode = useMatch.getState().mode;
    await leaveRoom();
    useMatch.setState({ ...initial(), mode, stage: "found" });
    const g = ++generation;
    try {
      const next = await (await getClient()).consumeSeatReservation(m.reservation);
      room = next;
      wireRoom(next, g);
    } catch (e) {
      errors.capture(e);
      set({ stage: "error", error: "Couldn't start the rematch." });
    }
  });
  r.onMessage("pong", (m: { serverNow: number }) => syncClock(m.serverNow));
  r.onDrop(() => gen === generation && set({ reconnecting: true }));
  r.onReconnect(() => gen === generation && set({ reconnecting: false }));
  r.onLeave((code: number) => {
    if (gen !== generation) return;
    const st = useMatch.getState().stage;
    if (code !== 1000 && st !== "result" && st !== "idle") set({ reconnecting: false, connectionLost: true });
  });
}

async function leaveRoom() {
  const r = room;
  room = null;
  try {
    await r?.leave(true);
  } catch {
    /* already gone */
  }
}

async function leaveQueue() {
  const q = queueRoom;
  queueRoom = null;
  try {
    await q?.leave(true);
  } catch {
    /* already gone */
  }
}

export const match = {
  async search(mode: "ranked" | "guest") {
    await this.reset();
    const gen = ++generation;
    useMatch.setState({ ...initial(), mode, stage: "searching", searchStartedAt: Date.now() });
    try {
      const q = await (await getClient()).joinOrCreate("queue", { mode });
      if (gen !== generation) return void q.leave();
      queueRoom = q;
      q.onMessage("queued", (m: { serverNow: number }) => syncClock(m.serverNow));
      q.onMessage("searching", (m: { window: number }) => set({ window: m.window }));
      q.onMessage("queueError", (m: { message: string; reason: string }) => set({ stage: "error", error: m.message }));
      q.onMessage("matched", async (m: { reservation: any; withBot: boolean }) => {
        if (gen !== generation) return;
        await leaveQueue();
        try {
          const r = await (await getClient()).consumeSeatReservation(m.reservation);
          if (gen !== generation) return void r.leave();
          room = r;
          wireRoom(r, gen);
          set({ stage: "found" });
          haptic.medium();
          sfx.play("found");
          analytics.track("match_found", { withBot: m.withBot, waitedMs: Date.now() - useMatch.getState().searchStartedAt });
        } catch (e) {
          errors.capture(e);
          set({ stage: "error", error: "Couldn't join the match. Try again." });
        }
      });
    } catch (e: any) {
      if (gen !== generation) return;
      set({ stage: "error", error: /auth|token|session/i.test(String(e?.message)) ? "Your session expired. Sign in again." : "Can't reach the game server. Check your connection." });
    }
  },
  ban(categoryId: string) {
    if (useMatch.getState().myBan) return;
    set({ myBan: categoryId });
    haptic.tap();
    room?.send("ban", { categoryId });
  },
  answer(optionId: string) {
    const { question, myAnswer, stage } = useMatch.getState();
    if (!question || myAnswer || stage !== "question") return;
    set({ myAnswer: optionId });
    haptic.tap();
    sfx.play("tap");
    room?.send("answer", { questionId: question.questionId, optionId });
  },
  powerUp(kind: PowerUpKind) {
    const s = useMatch.getState();
    if (s.stage !== "question" || s.myAnswer || s.powerUpPending || (s.me && s.players[s.me]?.powerUpUsed)) return;
    set({ powerUpPending: kind });
    room?.send("powerup", { kind });
  },
  requestRematch() {
    set({ rematch: { ...useMatch.getState().rematch, waiting: true } });
    room?.send("rematch");
  },
  clearError() {
    set({ error: null });
  },
  async reset() {
    generation++;
    await leaveQueue();
    await leaveRoom();
    useMatch.setState({ ...initial(), mode: useMatch.getState().mode });
  },
};
