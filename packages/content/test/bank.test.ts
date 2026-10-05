import { describe, expect, it } from "vitest";
import { questionInputSchema } from "@ntc/shared";
import { BANKS, buildQuestions } from "../src";

describe("seed question bank", () => {
  it("has exactly 100 questions in each of the 6 seeded categories", () => {
    expect(BANKS).toHaveLength(6);
    for (const b of BANKS) expect(b.questions.length, b.category).toBe(100);
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
});
