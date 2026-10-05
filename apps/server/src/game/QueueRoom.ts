import { Room, matchMaker, type Client } from "@colyseus/core";
import { pairQueue, MATCHMAKING_TIMEOUT_MS, ratingWindow } from "@ntc/shared";
import { verifyToken, ensureProfile, type AuthUser } from "../auth";
import { getDb } from "../db";
import { getProfileRow } from "../repo/profiles";
import { errors } from "../services/errors";
import type { QueueStore, QueuedPlayer } from "./queueStore";
import type { MatchRoomOptions } from "./MatchRoom";

let store: QueueStore;
export const setQueueStore = (s: QueueStore) => (store = s);

const TICK_MS = 250;
const channel = (userId: string) => `ntc:mm:matched:${userId}`;

/** One lobby-style room that holds everyone searching; pairing runs on a short tick. */
export class QueueRoom extends Room {
  maxClients = 5_000;
  private byUser = new Map<string, Client>();
  private subs = new Map<string, (msg: unknown) => void>();

  static async onAuth(token: string): Promise<AuthUser> {
    return verifyToken(token);
  }

  onCreate() {
    this.setSimulationInterval(() => void this.tick().catch((e) => errors.capture(e, { where: "mm.tick" })), TICK_MS);
  }

  async onJoin(client: Client, options: { mode?: "ranked" | "guest" } = {}) {
    const auth = client.auth as AuthUser;
    const sql = await getDb();
    await ensureProfile(sql, auth);
    const row = await getProfileRow(sql, auth.userId);
    if (!row) throw new Error("Profile missing");
    const mode: QueuedPlayer["mode"] = row.is_guest ? "guest" : options.mode === "guest" ? "guest" : "ranked";
    if (row.is_guest && row.guest_match_used) {
      client.send("queueError", { reason: "guest_limit", message: "Your free match is done — sign in to keep playing." });
      client.leave();
      return;
    }
    // Same account searching on two devices: newest wins.
    const prev = this.byUser.get(auth.userId);
    if (prev && prev !== client) prev.leave();
    this.byUser.set(auth.userId, client);

    if (!this.subs.has(auth.userId)) {
      const cb = (msg: unknown) => this.byUser.get(auth.userId)?.send("matched", msg);
      this.subs.set(auth.userId, cb);
      await this.presence.subscribe(channel(auth.userId), cb);
    }
    const joinedAt = Date.now();
    await store.add({ userId: auth.userId, rating: row.rating, joinedAt, mode });
    client.send("queued", { joinedAt, serverNow: joinedAt, window: ratingWindow(0), timeoutMs: MATCHMAKING_TIMEOUT_MS });
  }

  async onLeave(client: Client) {
    const auth = client.auth as AuthUser | undefined;
    if (!auth || this.byUser.get(auth.userId) !== client) return;
    this.byUser.delete(auth.userId);
    await store.remove(auth.userId);
    const cb = this.subs.get(auth.userId);
    if (cb) {
      this.presence.unsubscribe(channel(auth.userId), cb);
      this.subs.delete(auth.userId);
    }
  }

  private async tick() {
    if (!(await store.tryLock(TICK_MS * 2))) return;
    const entries = await store.list();
    if (!entries.length) return;
    const now = Date.now();
    for (const mode of ["ranked", "guest"] as const) {
      const { pairs, timedOut } = pairQueue(entries.filter((e) => e.mode === mode), now);
      for (const [a, b] of pairs) await this.launch(mode, [a.userId, b.userId], false);
      for (const e of timedOut) await this.launch(mode, [e.userId], true);
    }
    // Broadcast the widening window so the search screen can show it.
    for (const e of entries) this.byUser.get(e.userId)?.send("searching", { window: ratingWindow(now - e.joinedAt), waitedMs: now - e.joinedAt });
  }

  private async launch(mode: "ranked" | "guest", userIds: string[], withBot: boolean) {
    for (const id of userIds) await store.remove(id);
    try {
      const room = await matchMaker.createRoom("match", { mode, userIds, withBot } satisfies MatchRoomOptions);
      for (const userId of userIds) {
        const reservation = await matchMaker.reserveSeatFor(room, {}, { userId });
        await this.presence.publish(channel(userId), { reservation, withBot });
      }
    } catch (e) {
      errors.capture(e, { where: "mm.launch", userIds });
      for (const userId of userIds) this.byUser.get(userId)?.send("queueError", { reason: "server", message: "Couldn't start the match. Try again." });
    }
  }
}
