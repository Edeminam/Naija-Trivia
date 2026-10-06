import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const API = "http://localhost:2567/api";
const APP = "http://localhost:8081";
const stamp = Date.now() % 100000;
async function mkUser(name, state, avatar) {
  const r = await fetch(`${API}/auth/dev`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) }).then((r) => r.json());
  await fetch(`${API}/me/onboarding`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${r.token}` }, body: JSON.stringify({ username: name, avatarId: avatar, stateCode: state }) });
  return r;
}
const browser = await chromium.launch();
async function ctxFor(u, scheme = "dark") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  if (u) await ctx.addInitScript((s) => localStorage.setItem("ntc.session", s), JSON.stringify({ token: u.token, userId: u.userId, provider: "dev" }));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && console.log("console", m.text().slice(0, 300)));
  return p;
}
async function playSolo(p, n, shotPrefix) {
  for (let i = 0; i < n; i++) {
    await p.getByLabel(/^Option A:/).waitFor({ timeout: 20000 });
    await p.waitForTimeout(300);
    if (i === 0 && shotPrefix) await p.screenshot({ path: `${OUT}-${shotPrefix}-q.png` });
    await p.getByLabel(/^Option [ABCD]:/).nth(i % 4).click();
    await p.getByText("Did you know?").waitFor({ timeout: 10000 });
    if (i === 0 && shotPrefix) { await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}-${shotPrefix}-r.png` }); }
    await p.waitForTimeout(2400);
  }
}
const A = await mkUser(`tola${stamp}`, "LA", "zainab");
const pa = await ctxFor(A);
await pa.goto(`${APP}/challenge/new`, { waitUntil: "networkidle" });
await pa.getByText("Play your round first").waitFor({ timeout: 15000 });
await pa.waitForTimeout(600);
await pa.screenshot({ path: `${OUT}-new.png` });
const code = (await pa.getByText(/Challenge #/).first().textContent()).split("#")[1].trim();
console.log("code", code);
await pa.getByText("Play your round first").click();
await playSolo(pa, 7, "ch");
await pa.waitForURL(new RegExp(`/c/${code}`), { timeout: 20000 });
await pa.waitForTimeout(1500);
await pa.screenshot({ path: `${OUT}-landing-a.png` });
// Friend opens the link on web with no account
const pb = await ctxFor(null, "light");
await pb.goto(`${APP}/c/${code}`, { waitUntil: "networkidle" });
await pb.waitForTimeout(1500);
await pb.screenshot({ path: `${OUT}-landing-b.png` });
await pb.getByTestId("accept-challenge").click();
await playSolo(pb, 7);
await pb.waitForURL(new RegExp(`/c/${code}`), { timeout: 20000 });
await pb.waitForTimeout(1800);
await pb.screenshot({ path: `${OUT}-landing-b-done.png` });
// Daily Naija for A
await pa.goto(`${APP}/daily`, { waitUntil: "networkidle" });
await pa.waitForTimeout(1500);
await pa.screenshot({ path: `${OUT}-daily.png` });
await pa.getByTestId("play-daily").click();
await playSolo(pa, 10, "daily");
await pa.waitForURL(/\/daily/, { timeout: 20000 });
await pa.waitForTimeout(1800);
await pa.screenshot({ path: `${OUT}-daily-done.png` });
const hist = await fetch(`${API}/profile/me/stats`, { headers: { authorization: `Bearer ${A.token}` } }).then((r) => r.json());
console.log("A history", hist.history.map((h) => `${h.type}:${h.result}:${h.myScore}-${h.oppScore}`));
await browser.close();
