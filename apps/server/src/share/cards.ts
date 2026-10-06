import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Router } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { avatarSvg, stateByCode, categoryBySlug, leagueForRating, LEAGUES } from "@ntc/shared";
import { getDb } from "../db";
import { env } from "../env";
import { errors } from "../services/errors";

const here = dirname(fileURLToPath(import.meta.url));
// Works from src/share (dev) and from the bundled dist/ (prod).
const FONT_DIR = [resolve(here, "../../assets/fonts"), resolve(here, "../assets/fonts"), resolve(process.cwd(), "assets/fonts")].find((d) => existsSync(d))!;
const font = (f: string) => readFileSync(resolve(FONT_DIR, f));
const FONTS = [
  { name: "Satoshi", data: font("Satoshi-Black.ttf"), weight: 900 as const, style: "normal" as const },
  { name: "Satoshi", data: font("Satoshi-Bold.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter_500Medium.ttf"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: font("Inter_700Bold.ttf"), weight: 700 as const, style: "normal" as const },
];

const W = 1080;
const H = 1920;
const C = { bg: "#0B0F0D", surface: "#141A17", raised: "#1C2420", green: "#0FA958", gold: "#E8B44A", text: "#F4F6F5", muted: "#A3ADA8", line: "rgba(255,255,255,0.10)" };

// Minimal hyperscript for Satori (avoids a JSX build step on the server).
type Node = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, ...children: (Node | string | null | false)[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.filter(Boolean) },
});
const img = (src: string, size: number) => ({ type: "img", props: { src, width: size, height: size, style: { width: size, height: size } } });
const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const ADIRE = dataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36"><g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1.3" fill="none"><circle cx="18" cy="18" r="11"/><circle cx="18" cy="18" r="6"/><path d="M0 0 L6 6 M36 0 L30 6 M0 36 L6 30 M36 36 L30 30 M18 0 V3 M18 33 V36 M0 18 H3 M33 18 H36"/></g></svg>`,
);

function frame(...children: (Node | null)[]): Node {
  return h(
    "div",
    { width: W, height: H, flexDirection: "column", backgroundColor: C.bg, backgroundImage: `url(${ADIRE}), radial-gradient(circle at 50% 30%, #11402A 0%, ${C.bg} 62%)`, backgroundRepeat: "repeat, no-repeat", color: C.text, fontFamily: "Inter", padding: 80 },
    h(
      "div",
      { alignItems: "center", gap: 20 },
      h("div", { width: 72, height: 72, borderRadius: 20, backgroundColor: C.green, alignItems: "center", justifyContent: "center", fontFamily: "Satoshi", fontWeight: 900, fontSize: 40, color: "#03140B" }, "N"),
      h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 44 }, "Naija Trivia Clash"),
    ),
    ...children.filter((c): c is Node => !!c),
  );
}

function playerBlock(p: { username: string; avatarId: string; stateCode: string; rating: number }, score: number, highlight: boolean): Node {
  const league = leagueForRating(p.rating);
  return h(
    "div",
    { flexDirection: "column", alignItems: "center", gap: 18, width: 380 },
    img(dataUri(avatarSvg(p.avatarId, highlight ? C.gold : league.color)), 240),
    h("div", { fontFamily: "Satoshi", fontWeight: 700, fontSize: 46, maxWidth: 380, overflow: "hidden" }, p.username),
    h("div", { fontSize: 30, color: C.muted }, `${stateByCode(p.stateCode)?.name ?? "Naija"} · ${league.name}`),
    h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 120, color: highlight ? C.gold : C.text, marginTop: 10 }, score.toLocaleString("en-NG")),
  );
}

async function render(node: Node): Promise<Buffer> {
  const svg = await satori(node as any, { width: W, height: H, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

const cache = new Map<string, { png: Buffer; at: number }>();
const CACHE_MS = 10 * 60_000;

async function cached(key: string, make: () => Promise<Buffer | null>) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.png;
  const png = await make();
  if (png) {
    cache.set(key, { png, at: Date.now() });
    if (cache.size > 300) cache.delete(cache.keys().next().value!);
  }
  return png;
}

async function matchCard(id: string): Promise<Buffer | null> {
  const sql = await getDb();
  const m = await sql.one(
    `select m.*, a.username as a_name, a.avatar_id as a_avatar, a.state_code as a_state, a.rating as a_rating,
            b.username as b_name, b.avatar_id as b_avatar, b.state_code as b_state, b.rating as b_rating
       from matches m join profiles a on a.id = m.player_a left join profiles b on b.id = m.player_b where m.id = $1`,
    [id],
  );
  if (!m) return null;
  const A = { username: m.a_name ?? "Player", avatarId: m.a_avatar, stateCode: m.a_state ?? "DI", rating: m.a_rating };
  const B = m.is_bot ? { username: m.bot_name ?? "Practice opponent", avatarId: "musa", stateCode: "LA", rating: m.bot_rating ?? 1000 } : { username: m.b_name ?? "Player", avatarId: m.b_avatar ?? "ada", stateCode: m.b_state ?? "DI", rating: m.b_rating ?? 1000 };
  const aWon = m.winner === m.player_a;
  const draw = !m.winner;
  const headline = draw ? "IT'S A DRAW" : aWon ? `${A.username.toUpperCase()} WINS` : `${B.username.toUpperCase()} WINS`;
  const cats = (m.categories as string[]).map((s) => categoryBySlug(s)?.name ?? s);
  return render(
    frame(
      h("div", { flexDirection: "column", alignItems: "center", marginTop: 170, gap: 24 },
        h("div", { fontSize: 34, letterSpacing: 8, color: C.green, fontWeight: 700 }, m.is_bot ? "PRACTICE MATCH" : m.type === "friend" ? "FRIEND CHALLENGE" : "RANKED CLASH"),
        h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 92, textAlign: "center", maxWidth: 920, lineHeight: 1.05 }, headline),
      ),
      h("div", { justifyContent: "space-between", alignItems: "center", marginTop: 130 },
        playerBlock(A, m.score_a, aWon),
        h("div", { width: 120, height: 120, borderRadius: 60, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", fontFamily: "Satoshi", fontWeight: 900, fontSize: 48, color: "#03140B" }, "VS"),
        playerBlock(B, m.score_b, !aWon && !draw),
      ),
      h("div", { justifyContent: "center", gap: 18, marginTop: 110, flexWrap: "wrap" },
        ...cats.map((c) => h("div", { padding: "16px 30px", borderRadius: 999, backgroundColor: "rgba(15,169,88,0.16)", color: "#2FCB78", fontSize: 32, fontWeight: 700 }, c)),
      ),
      h("div", { flexDirection: "column", alignItems: "center", marginTop: "auto", gap: 18 },
        h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 64 }, "Think you sabi pass?"),
        h("div", { fontSize: 34, color: C.muted }, "Real-time Naija trivia · rep your state"),
        h("div", { marginTop: 18, padding: "22px 48px", borderRadius: 28, backgroundColor: C.green, color: "#03140B", fontSize: 38, fontWeight: 700 }, env.appUrl.replace(/^https?:\/\//, "")),
      ),
    ),
  );
}

async function challengeCard(code: string): Promise<Buffer | null> {
  const sql = await getDb();
  const c = await sql.one(
    `select c.code, c.categories, c.expires_at, p.username, p.avatar_id, p.state_code, p.rating,
            (select score from challenge_entries e where e.challenge_id = c.id and e.user_id = c.created_by and e.finished_at is not null) as score
       from challenges c join profiles p on p.id = c.created_by where c.code = $1`,
    [code.toUpperCase()],
  );
  if (!c) return null;
  const league = leagueForRating(c.rating);
  const cats = (c.categories as string[]).map((s) => categoryBySlug(s)?.name ?? s);
  return render(
    frame(
      h("div", { flexDirection: "column", alignItems: "center", marginTop: 160, gap: 30 },
        img(dataUri(avatarSvg(c.avatar_id, LEAGUES.find((l) => l.id === league.id)?.color)), 300),
        h("div", { fontSize: 34, letterSpacing: 8, color: C.gold, fontWeight: 700 }, "YOU'VE BEEN CHALLENGED"),
        h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 96, textAlign: "center", maxWidth: 920, lineHeight: 1.05 }, `${c.username ?? "Your friend"} says you no fit!`),
        h("div", { fontSize: 34, color: C.muted }, `${stateByCode(c.state_code)?.name ?? "Naija"} · ${league.name}`),
      ),
      c.score != null
        ? h("div", { flexDirection: "column", alignItems: "center", marginTop: 90, padding: "36px 80px", borderRadius: 40, backgroundColor: C.surface, border: `2px solid ${C.line}`, alignSelf: "center" },
            h("div", { fontSize: 32, color: C.muted }, "Score to beat"),
            h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 150, color: C.gold }, Number(c.score).toLocaleString("en-NG")),
          )
        : null,
      h("div", { justifyContent: "center", gap: 18, marginTop: 70, flexWrap: "wrap" },
        ...cats.map((x) => h("div", { padding: "16px 30px", borderRadius: 999, backgroundColor: "rgba(15,169,88,0.16)", color: "#2FCB78", fontSize: 32, fontWeight: 700 }, x)),
      ),
      h("div", { flexDirection: "column", alignItems: "center", marginTop: "auto", gap: 18 },
        h("div", { fontFamily: "Satoshi", fontWeight: 900, fontSize: 60 }, "Same 7 questions. Oya!"),
        h("div", { marginTop: 10, padding: "22px 48px", borderRadius: 28, backgroundColor: C.green, color: "#03140B", fontSize: 38, fontWeight: 700 }, `Code ${c.code}`),
      ),
    ),
  );
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Tiny OpenGraph page so WhatsApp/Twitter show the card, then hop into the app. */
function linkPage(title: string, description: string, image: string, target: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1920">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0B0F0D">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<style>body{margin:0;background:#0B0F0D;color:#F4F6F5;font:16px system-ui;display:flex;align-items:center;justify-content:center;height:100vh}a{color:#2FCB78}</style>
</head><body><p>Opening Naija Trivia Clash… <a href="${esc(target)}">Tap here</a> if nothing happens.</p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;
}

export const share = Router();

share.get("/share/match/:id.png", async (req, res) => {
  try {
    const png = await cached(`m:${req.params.id}`, () => matchCard(String(req.params.id)));
    if (!png) return void res.status(404).end();
    res.set({ "content-type": "image/png", "cache-control": "public, max-age=600" }).send(png);
  } catch (e) {
    errors.capture(e, { where: "share.match" });
    res.status(500).end();
  }
});

share.get("/share/challenge/:code.png", async (req, res) => {
  try {
    const png = await cached(`c:${req.params.code}`, () => challengeCard(String(req.params.code)));
    if (!png) return void res.status(404).end();
    res.set({ "content-type": "image/png", "cache-control": "public, max-age=300" }).send(png);
  } catch (e) {
    errors.capture(e, { where: "share.challenge" });
    res.status(500).end();
  }
});

share.get("/l/c/:code", (req, res) => {
  const code = String(req.params.code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  res.type("html").send(linkPage("You've been challenged on Naija Trivia Clash", "Same 7 questions. Beat my score in 48 hours. Oya!", `${env.publicUrl}/share/challenge/${code}.png`, `${env.appUrl}/c/${code}`));
});

share.get("/l/s/:id", (req, res) => {
  const id = String(req.params.id).replace(/[^a-f0-9-]/gi, "");
  res.type("html").send(linkPage("Naija Trivia Clash result", "Real-time Naija trivia. Think you sabi pass?", `${env.publicUrl}/share/match/${id}.png`, `${env.appUrl}/s/${id}`));
});
