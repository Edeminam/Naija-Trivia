import { describe, expect, it } from "vitest";
import { questionInputSchema, CATEGORIES } from "@ntc/shared";
import { BANKS, buildQuestions } from "../src";
import { TRANSLATIONS } from "../src/bank/translations";
import { DROPS } from "../src/bank/drops";
import { CONTENT_WEEKLY_TARGET } from "@ntc/shared";

describe("seed question bank", () => {
  it("seeds every category with a deep enough bank", () => {
    expect(BANKS.map((b) => b.category).sort()).toEqual(CATEGORIES.map((c) => c.slug).sort());
    for (const b of BANKS) expect(b.questions.filter((q) => q.status === "live").length, b.category).toBeGreaterThanOrEqual(100);
  });

  it("every question passes the authoring schema", () => {
    for (const q of buildQuestions()) {
      const r = questionInputSchema.safeParse({ ...q, status: q.status });
      expect(r.success, `${q.text}: ${r.success ? "" : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });

  it("has no duplicate questions", () => {
    const texts = buildQuestions().map((q) => q.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("spreads difficulty across all 5 levels in every category", () => {
    for (const b of BANKS) {
      const levels = new Set(b.questions.map((q) => q.difficulty));
      expect([...levels].sort()).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("shuffles correct answers away from always being first", () => {
    const qs = buildQuestions();
    const counts = [0, 0, 0, 0];
    for (const q of qs) counts[q.correctIndex]!++;
    for (const c of counts) expect(c).toBeGreaterThan(qs.length * 0.15);
  });

  it("is deterministic", () => {
    expect(buildQuestions()).toEqual(buildQuestions());
  });

  it("every translation matches a live question and keeps 4 distinct options in the same order", () => {
    const byText = new Map(BANKS.flatMap((b) => b.questions).map((q) => [q.text, q]));
    for (const [locale, entries] of Object.entries(TRANSLATIONS)) {
      for (const [text, t] of Object.entries(entries ?? {})) {
        const q = byText.get(text);
        expect(q, `${locale}: no question "${text}"`).toBeTruthy();
        expect(q!.status, `${locale}: "${text}" isn't live`).toBe("live");
        expect(new Set(t.options.map((o) => o.toLowerCase())).size, `${locale}: "${text}" options`).toBe(4);
        expect(t.text.length).toBeLessThanOrEqual(220);
        // Names and numbers stay the same, so the correct answer is usually unchanged.
        if (/^[\d₦]/.test(q!.options[0])) expect(t.options[0]).toBe(q!.options[0]);
      }
    }
    const built = buildQuestions().filter((q) => q.translations.length);
    for (const q of built) for (const t of q.translations) expect(t.options).toHaveLength(4);
    expect(built.length).toBe(Object.keys(TRANSLATIONS.pcm ?? {}).length);
  });

  it("schedules weekly drops on Mondays, hitting the weekly target, without repeating an existing answer", () => {
    for (const d of DROPS) {
      expect(new Date(`${d.release}T12:00:00Z`).getUTCDay(), d.release).toBe(1);
      const n = Object.values(d.questions).reduce((a, qs) => a + (qs?.length ?? 0), 0);
      expect(n, d.release).toBeGreaterThanOrEqual(CONTENT_WEEKLY_TARGET);
    }
    const built = buildQuestions();
    const scheduled = built.filter((q) => q.releaseAt);
    expect(scheduled.length).toBe(DROPS.reduce((a, d) => a + Object.values(d.questions).reduce((x, qs) => x + (qs?.length ?? 0), 0), 0));
    // Same correct answer in the same category usually means the same fact asked twice.
    const answer = (q: { category: string; options: string[]; correctIndex: number }) => `${q.category}:${q.options[q.correctIndex]!.toLowerCase()}`;
    const earlier = new Set(built.filter((q) => !q.releaseAt).map(answer));
    const clashes = scheduled.filter((q) => earlier.has(answer(q))).map((q) => q.text);
    expect(clashes).toEqual([]);
  });
});
