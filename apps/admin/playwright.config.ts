import { defineConfig } from "@playwright/test";

/** Admin smoke test. Boots the game server (in-memory DB) and the admin app unless already running. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3000", viewport: { width: 1366, height: 900 } },
  webServer: [
    { command: "pnpm --filter @ntc/server dev", url: "http://localhost:2567/health", reuseExistingServer: true, timeout: 120_000, env: { PGLITE_DIR: "memory://" } },
    { command: "pnpm dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
  ],
});
