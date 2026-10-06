// Two real browsers play a ranked match against each other through the UI.
import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const API = "http://localhost:2567/api";
const APP = "http://localhost:8081";
async function mkUser(name, state, avatar) {
  const r = await fetch(`${API}/auth/dev`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) }).then((r) => r.json());
  await fetch(`${API}/me/onboarding`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${r.token}` }, body: JSON.stringify({ username: name, avatarId: avatar, stateCode: state }) });
  return r;
}
const stamp = Date.now() % 100000;
const A = await mkUser(`chidi${stamp}`, "EN", "emeka");
const B = await mkUser(`kemi${stamp}`, "OY", "bisi");
const browser = await chromium.launch();
async function open(u, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.addInitScript((s) => localStorage.setItem("ntc.session", s), JSON.stringify({ token: u.token, userId: u.userId, provider: "dev" }));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  p.on("console", (m) => m.type() === "error" && console.log("console", m.text().slice(0, 300)));
  await p.goto(`${APP}/home`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  return p;
}
const pa = await open(A, "dark");
const pb = await open(B, "light");
await pa.screenshot({ path: `${OUT}-home.png` });
await pa.getByTestId("play-clash").click();
await pa.waitForTimeout(700);
await pa.screenshot({ path: `${OUT}-search.png` });
await pb.getByTestId("play-clash").click();
await pa.waitForTimeout(900);
await pa.screenshot({ path: `${OUT}-found.png` });
await pa.getByText("Ban a category").waitFor({ timeout: 15000 });
await pa.waitForTimeout(500);
await pa.screenshot({ path: `${OUT}-ban.png` });
await pa.getByLabel(/^Ban /).first().click();
await pb.getByLabel(/^Ban /).nth(2).click();
let shotQ = false, shotR = false, shotW = false;
for (let round = 1; round <= 7; round++) {
  if (round === 7) { await pa.getByText("DOUBLE").waitFor({ timeout: 15000 }).catch(() => {}); await pa.waitForTimeout(500); await pa.screenshot({ path: `${OUT}-wahala.png` }); }
  await pa.getByLabel(/^Option A:/).waitFor({ timeout: 20000 });
  await pa.waitForTimeout(400);
  if (!shotQ) { await pa.screenshot({ path: `${OUT}-question.png` }); shotQ = true; }
  const pick = Math.floor(Math.random() * 4);
  await pa.getByLabel(/^Option [ABCD]:/).nth(pick).click();
  await pa.waitForTimeout(250);
  if (round === 1) await pa.screenshot({ path: `${OUT}-locked.png` });
  await pb.getByLabel(/^Option A:/).waitFor({ timeout: 20000 });
  await pb.getByLabel(/^Option [ABCD]:/).nth((pick + 1) % 4).click();
  await pa.getByText("Did you know?").waitFor({ timeout: 15000 });
  await pa.waitForTimeout(300);
  if (!shotR) { await pa.screenshot({ path: `${OUT}-reveal.png` }); await pb.screenshot({ path: `${OUT}-reveal-b.png` }); shotR = true; }
}
await pa.waitForURL(/result/, { timeout: 20000 });
await pa.waitForTimeout(2200);
await pa.screenshot({ path: `${OUT}-result.png` });
await pb.waitForTimeout(500);
await pb.screenshot({ path: `${OUT}-result-b.png` });
console.log("DONE", A.userId, B.userId);
await browser.close();
