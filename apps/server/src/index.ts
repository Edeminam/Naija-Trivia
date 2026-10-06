import express from "express";
import cors from "cors";
import { defineServer, defineRoom } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { env } from "./env";
import { getDb } from "./db";
import { player } from "./api/player";
import { share } from "./share/cards";
import { dev } from "./api/dev";
import { errorHandler } from "./api/http";
import { MatchRoom } from "./game/MatchRoom";
import { QueueRoom, setQueueStore } from "./game/QueueRoom";
import { createQueueStore } from "./game/queueStore";
import { currentSeason } from "./repo/seasons";
import { ensureDailySet } from "./repo/daily";
import { runNotificationTick } from "./services/notifications";
import { errors } from "./services/errors";

export async function startServer(port = env.port, opts: { jobs?: boolean } = {}) {
  const sql = await getDb();
  setQueueStore(await createQueueStore());
  await currentSeason(sql);
  await ensureDailySet(sql);

  const server = defineServer({
    greet: false,
    transport: new WebSocketTransport({ pingInterval: 4_000, pingMaxRetries: 3 }),
    rooms: {
      queue: defineRoom(QueueRoom),
      match: defineRoom(MatchRoom),
    },
    express: (app) => {
      app.set("trust proxy", true);
      app.use(cors({ origin: true, credentials: false, maxAge: 600 }));
      app.use(express.json({ limit: "2mb" }));
      app.get("/health", (_req, res) => void res.json({ ok: true, db: sql.kind, time: Date.now() }));
      app.use("/api", player);
      app.use("/api", dev);
      app.use(share);
      app.use(errorHandler);
    },
  });

  await server.listen(port);
  if (!env.isTest) console.log(`\n🇳🇬 Naija Trivia Clash server on ${env.publicUrl}  (db: ${sql.kind}, dev auth: ${env.allowDevAuth ? "on" : "off"})\n`);
  if (opts.jobs === false) return { server, sql };

  // Background jobs: season rollover, tomorrow's Daily set, notification tick.
  setInterval(() => {
    void (async () => {
      try {
        await currentSeason(sql);
        await ensureDailySet(sql);
        await runNotificationTick(sql);
      } catch (e) {
        errors.capture(e, { where: "jobs" });
      }
    })();
  }, 60_000);
  return { server, sql };
}

const isEntry = process.argv[1] && /index\.(ts|js|mjs)$/.test(process.argv[1]);
if (isEntry) {
  startServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
