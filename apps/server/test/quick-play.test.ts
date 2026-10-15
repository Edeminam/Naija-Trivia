import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { startServer } from "../src/index";
import { env } from "../src/env";

// A public deploy without Supabase keys ("quick play"): dev auth stays on, but production rules apply.
const PORT = 29_568;
const BASE = `http://localhost:${PORT}/api`;
let stop: () => Promise<void>;

const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeAll(async () => {
  const s = await startServer(PORT, { jobs: false });
  stop = () => s.server.gracefullyShutdown(false);
}, 60_000);

afterAll(async () => {
  await stop?.();
});

afterEach(() => {
  env.isProduction = false;
});

describe("quick play on a public deploy", () => {
  it("won't hand over an account to someone who types its username", async () => {
    env.isProduction = true;
    const first = await post("/auth/dev", { username: "taken_name" });
    expect(first.status).toBe(200);
    const again = await post("/auth/dev", { username: "TAKEN_NAME" });
    expect(again.status).toBe(409);
    expect((await again.json()).error).toMatch(/taken/);
  });

  it("ignores requests to be made an admin, and keeps demo data off", async () => {
    env.isProduction = true;
    const { token } = await (await post("/auth/dev", { username: "wants_admin", admin: true })).json();
    const me = await fetch(`${BASE}/admin/me`, { headers: { authorization: `Bearer ${token}` } });
    expect(me.status).toBe(403);
    expect((await post("/dev/demo-data", {})).status).toBe(404);
  });

  it("still lets guests in with one call", async () => {
    env.isProduction = true;
    const res = await post("/auth/dev", { guest: true });
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  it("locally too, a taken username is refused", async () => {
    expect((await post("/auth/dev", { username: "local_tester" })).status).toBe(200);
    expect((await post("/auth/dev", { username: "local_tester" })).status).toBe(409);
  });

  it("locally, the admin dashboard can sign back in as admin", async () => {
    const a = await (await post("/auth/dev", { username: "admin", admin: true })).json();
    const b = await (await post("/auth/dev", { username: "admin", admin: true })).json();
    expect(b.userId).toBe(a.userId);
  });
});
