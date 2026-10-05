// Verifies every source_url resolves (HTTP 200 after redirects). Run: pnpm --filter @ntc/content check-sources
import { buildQuestions } from "./index";

const urls = [...new Set(buildQuestions().map((q) => q.sourceUrl))];
const bad: string[] = [];
let done = 0;

async function check(url: string) {
  // Use the REST summary endpoint for Wikipedia — lighter and follows redirects.
  const m = url.match(/^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/);
  const probe = m ? `https://en.wikipedia.org/api/rest_v1/page/summary/${m[1]}` : url;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(probe, { redirect: "follow", headers: { "user-agent": "NaijaTriviaClash-source-check/1.0" } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
      if (!res.ok) bad.push(`${res.status} ${url}`);
      return;
    } catch (e) {
      if (attempt === 2) bad.push(`ERR ${url} ${(e as Error).message}`);
    }
  }
}

const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      await check(queue.shift()!);
      done++;
    }
  }),
);
console.log(`Checked ${done} unique URLs; ${bad.length} failed`);
for (const b of bad) console.log("  " + b);
process.exit(bad.length ? 1 : 0);
