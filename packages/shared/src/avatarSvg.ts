import { AVATARS, type AvatarDef } from "./constants";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, "0")}`;
}

function hair(a: AvatarDef): string {
  const h = "#15100C";
  switch (a.hair) {
    case "gele":
      return `<path d="M27 40 C22 26 32 10 50 10 C69 10 79 24 74 40 C70 33 62 30 50 30 C38 30 31 33 27 40 Z" fill="${a.accent}"/><path d="M68 18 C80 12 88 18 84 28 C80 24 75 23 70 26 Z" fill="${shade(a.accent, -30)}"/><path d="M34 22 C42 17 58 16 67 22 M31 30 C40 24 60 24 70 30" stroke="${shade(a.accent, -45)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    case "fila":
      return `<path d="M31 38 C31 22 40 15 52 15 C64 15 70 22 70 32 L76 22 C79 30 76 37 70 40 Z" fill="${a.accent}"/><path d="M33 34 H68" stroke="${shade(a.accent, -40)}" stroke-width="2"/>`;
    case "bun":
      return `<g fill="${h}"><circle cx="50" cy="14" r="9"/><path d="M31 44 C30 27 39 20 50 20 C62 20 70 27 69 44 C65 34 58 30 50 30 C42 30 35 34 31 44 Z"/></g>`;
    case "low":
      return `<path d="M32 40 C32 26 40 21 50 21 C60 21 68 26 68 40 C64 31 57 28 50 28 C43 28 36 31 32 40 Z" fill="${h}"/>`;
    case "braids":
      return `<g fill="${h}"><path d="M30 46 C29 27 38 19 50 19 C62 19 71 27 70 46 C66 34 59 30 50 30 C41 30 34 34 30 46 Z"/>${[0, 1, 2].map((i) => `<rect x="${27 + i * 2}" y="${40 + i * 6}" width="4" height="${22 - i * 4}" rx="2"/><rect x="${69 - i * 2}" y="${40 + i * 6}" width="4" height="${22 - i * 4}" rx="2"/>`).join("")}</g>`;
    case "cap":
      return `<path d="M32 36 C32 22 40 17 50 17 C60 17 68 22 68 36 Z" fill="${a.accent}"/><path d="M36 25 H64 M34 31 H66" stroke="${shade(a.accent, -50)}" stroke-width="1.4" stroke-dasharray="2 3"/>`;
    case "afro":
      return `<circle cx="50" cy="36" r="26" fill="${h}"/>`;
    case "locs":
      return `<g fill="${h}"><path d="M30 44 C29 26 38 18 50 18 C62 18 71 26 70 44 C66 33 59 29 50 29 C41 29 34 33 30 44 Z"/>${[28, 33, 64, 69].map((x, i) => `<rect x="${x}" y="36" width="4" height="${i % 2 ? 26 : 30}" rx="2"/>`).join("")}</g>`;
  }
}

/** Standalone SVG string of a preset avatar (used by server-rendered share cards). */
export function avatarSvg(id: string, ring?: string): string {
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0]!;
  const face = `<ellipse cx="33" cy="48" rx="4" ry="6" fill="${shade(a.skin, -10)}"/><ellipse cx="67" cy="48" rx="4" ry="6" fill="${shade(a.skin, -10)}"/><ellipse cx="50" cy="45" rx="17" ry="20" fill="${a.skin}"/><ellipse cx="43.5" cy="46" rx="2.2" ry="2.6" fill="#120C08"/><ellipse cx="56.5" cy="46" rx="2.2" ry="2.6" fill="#120C08"/><path d="M44 55 C47 58.5 53 58.5 56 55" stroke="#120C08" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const body = `<path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill="${shade(a.bg, -70)}"/><path d="M40 70 L50 80 L60 70" fill="none" stroke="${a.accent}" stroke-width="3" stroke-linejoin="round"/><rect x="43" y="58" width="14" height="14" rx="5" fill="${shade(a.skin, -18)}"/>`;
  const inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(a.bg, 25)}"/><stop offset="1" stop-color="${shade(a.bg, -25)}"/></linearGradient><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs><circle cx="50" cy="50" r="50" fill="url(#g)"/><g clip-path="url(#c)">${body}${a.hair === "afro" ? hair(a) : ""}${face}${a.hair !== "afro" ? hair(a) : ""}</g>`;
  const ringSvg = ring ? `<circle cx="50" cy="50" r="48" fill="none" stroke="${ring}" stroke-width="4"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${inner}${ringSvg}</svg>`;
}
