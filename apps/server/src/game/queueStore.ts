import type { QueueEntry } from "@ntc/shared";
import { env } from "../env";

export interface QueuedPlayer extends QueueEntry {
  mode: "ranked" | "guest";
}

/** Matchmaking queue storage. Redis when REDIS_URL is set, otherwise in-process memory. */
export interface QueueStore {
  add(p: QueuedPlayer): Promise<void>;
  remove(userId: string): Promise<void>;
  list(): Promise<QueuedPlayer[]>;
  /** Single-flight guard so only one process pairs at a time. */
  tryLock(ms: number): Promise<boolean>;
  kind: "memory" | "redis";
}

class MemoryQueue implements QueueStore {
  kind = "memory" as const;
  private entries = new Map<string, QueuedPlayer>();
  async add(p: QueuedPlayer) {
    this.entries.set(p.userId, p);
  }
  async remove(id: string) {
    this.entries.delete(id);
  }
  async list() {
    return [...this.entries.values()];
  }
  async tryLock() {
    return true;
  }
}

class RedisQueue implements QueueStore {
  kind = "redis" as const;
  private key = "ntc:mm:queue";
  private lockKey = "ntc:mm:lock";
  constructor(private redis: any) {}
  async add(p: QueuedPlayer) {
    await this.redis.hset(this.key, p.userId, JSON.stringify(p));
  }
  async remove(id: string) {
    await this.redis.hdel(this.key, id);
  }
  async list() {
    const all: Record<string, string> = await this.redis.hgetall(this.key);
    return Object.values(all).map((v) => JSON.parse(v) as QueuedPlayer);
  }
  async tryLock(ms: number) {
    return (await this.redis.set(this.lockKey, String(process.pid), "PX", ms, "NX")) === "OK";
  }
}

export async function createQueueStore(): Promise<QueueStore> {
  if (env.redisUrl) {
    const { Redis } = await import("ioredis");
    const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 2 });
    console.log("[mm] using Redis matchmaking queue");
    return new RedisQueue(redis);
  }
  console.log("[mm] REDIS_URL not set — using in-memory matchmaking queue");
  return new MemoryQueue();
}
