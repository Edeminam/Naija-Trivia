/** Nigeria (Africa/Lagos) is UTC+1 all year — no DST — so plain offset maths is exact. */
export const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY = 86_400_000;

/** YYYY-MM-DD in Lagos time. */
export function lagosDate(at: Date | number = Date.now()): string {
  const t = typeof at === "number" ? at : at.getTime();
  return new Date(t + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Epoch ms of the next Lagos midnight. */
export function nextLagosMidnight(at: number = Date.now()): number {
  const local = at + LAGOS_OFFSET_MS;
  return Math.floor(local / DAY) * DAY + DAY - LAGOS_OFFSET_MS;
}

export const msUntilLagosMidnight = (at: number = Date.now()) => nextLagosMidnight(at) - at;

/** Monday (Lagos) of the week containing `at`, as YYYY-MM-DD. */
export function lagosWeekStart(at: number = Date.now()): string {
  const local = new Date(at + LAGOS_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(local.getTime() - dow * DAY).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** "12h 04m" / "04m 09s" style countdown. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}m ${pad(sec)}s`;
}
