import { describe, expect, it } from "vitest";
import {
  pointsForAnswer,
  isAnswerAccepted,
  decideWinner,
  ratingDelta,
  kFactor,
  expectedScore,
  botRating,
  leagueForRating,
  leagueProgress,
  seasonResetRating,
  ratingWindow,
  canPair,
  pairQueue,
  shouldFallBackToBot,
  targetDifficulty,
  selectQuestions,
  levelFromXp,
  xpToReachLevel,
  statePointsForWin,
  xpFor,
  coinsFor,
  lagosDate,
  nextLagosMidnight,
  lagosWeekStart,
  botAccuracy,
  botDelayMs,
  type CandidateQuestion,
} from "../src";

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

describe("scoring", () => {
  it("awards 100 + time bonus for a correct answer", () => {
    expect(pointsForAnswer({ correct: true, remainingMs: 10_000, round: 1 })).toBe(200);
    expect(pointsForAnswer({ correct: true, remainingMs: 5_000, round: 1 })).toBe(150);
    expect(pointsForAnswer({ correct: true, remainingMs: 0, round: 1 })).toBe(100);
    expect(pointsForAnswer({ correct: true, remainingMs: 3_333, round: 3 })).toBe(133);
  });

  it("gives zero for wrong or timed-out answers", () => {
    expect(pointsForAnswer({ correct: false, remainingMs: 9_000, round: 1 })).toBe(0);
    expect(pointsForAnswer({ correct: false, remainingMs: 0, round: 7 })).toBe(0);
  });

  it("doubles question 7 (Double Wahala)", () => {
    expect(pointsForAnswer({ correct: true, remainingMs: 5_000, round: 7 })).toBe(300);
  });

  it("clamps remaining time so Extra Time does not inflate points", () => {
    expect(pointsForAnswer({ correct: true, remainingMs: 14_000, round: 1 })).toBe(200);
    expect(pointsForAnswer({ correct: true, remainingMs: -50, round: 1 })).toBe(100);
  });
});

describe("answer deadline validation", () => {
  const deadline = 1_000_000;
  it("accepts answers before the deadline", () => expect(isAnswerAccepted(deadline - 1, deadline)).toBe(true));
  it("accepts answers inside the 300ms grace", () => {
    expect(isAnswerAccepted(deadline + 300, deadline)).toBe(true);
    expect(isAnswerAccepted(deadline + 150, deadline)).toBe(true);
  });
  it("rejects answers after deadline + grace", () => {
    expect(isAnswerAccepted(deadline + 301, deadline)).toBe(false);
    expect(isAnswerAccepted(deadline + 5_000, deadline)).toBe(false);
  });
});

describe("winner", () => {
  it("higher score wins", () => expect(decideWinner({ score: 900, totalMs: 40_000 }, { score: 850, totalMs: 10_000 })).toBe("a"));
  it("tie broken by lower total time", () => expect(decideWinner({ score: 800, totalMs: 30_000 }, { score: 800, totalMs: 25_000 })).toBe("b"));
  it("exact tie is a draw", () => expect(decideWinner({ score: 800, totalMs: 30_000 }, { score: 800, totalMs: 30_000 })).toBe("draw"));
});

describe("elo", () => {
  it("uses K=32 under 30 games and K=20 after", () => {
    expect(kFactor(0)).toBe(32);
    expect(kFactor(29)).toBe(32);
    expect(kFactor(30)).toBe(20);
  });
  it("halves K against bots", () => {
    expect(kFactor(5, true)).toBe(16);
    expect(kFactor(50, true)).toBe(10);
  });
  it("is symmetric for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
    expect(ratingDelta({ rating: 1200, opponentRating: 1200, score: 1, rankedGames: 0 })).toBe(16);
    expect(ratingDelta({ rating: 1200, opponentRating: 1200, score: 0, rankedGames: 0 })).toBe(-16);
    expect(ratingDelta({ rating: 1200, opponentRating: 1200, score: 0.5, rankedGames: 40 })).toBe(0);
  });
  it("rewards upsets more", () => {
    const upset = ratingDelta({ rating: 1000, opponentRating: 1400, score: 1, rankedGames: 40 });
    const expected = ratingDelta({ rating: 1400, opponentRating: 1000, score: 1, rankedGames: 40 });
    expect(upset).toBe(18);
    expect(expected).toBe(2);
  });
  it("bot matches count at half K", () => {
    expect(ratingDelta({ rating: 1000, opponentRating: 1000, score: 1, rankedGames: 0, vsBot: true })).toBe(8);
  });
  it("shield cancels a rating loss only", () => {
    expect(ratingDelta({ rating: 1000, opponentRating: 1000, score: 0, rankedGames: 0, shieldConsumed: true })).toBe(0);
    expect(ratingDelta({ rating: 1000, opponentRating: 1000, score: 1, rankedGames: 0, shieldConsumed: true })).toBe(16);
  });
  it("bot rating stays within ±50", () => {
    expect(botRating(1200, () => 0)).toBe(1150);
    expect(botRating(1200, () => 0.999999)).toBe(1250);
    for (let i = 0; i < 100; i++) expect(Math.abs(botRating(1500) - 1500)).toBeLessThanOrEqual(50);
  });
});

describe("leagues", () => {
  it("maps rating bands", () => {
    expect(leagueForRating(0).id).toBe("jjc");
    expect(leagueForRating(999).id).toBe("jjc");
    expect(leagueForRating(1000).id).toBe("learner");
    expect(leagueForRating(1299).id).toBe("learner");
    expect(leagueForRating(1300).id).toBe("sharp");
    expect(leagueForRating(1600).id).toBe("odogwu");
    expect(leagueForRating(1900).id).toBe("oga");
    expect(leagueForRating(2200).id).toBe("agba");
    expect(leagueForRating(3000).id).toBe("agba");
  });
  it("computes band progress", () => {
    expect(leagueProgress(1150)).toBeCloseTo(0.5);
    expect(leagueProgress(2500)).toBe(1);
  });
  it("soft resets at season end", () => {
    expect(seasonResetRating(1600)).toBe(1300);
    expect(seasonResetRating(1000)).toBe(1000);
    expect(seasonResetRating(800)).toBe(900);
    expect(seasonResetRating(0)).toBe(500);
  });
});

describe("matchmaking widening", () => {
  it("starts at ±100 and widens 50 per second", () => {
    expect(ratingWindow(0)).toBe(100);
    expect(ratingWindow(999)).toBe(100);
    expect(ratingWindow(1000)).toBe(150);
    expect(ratingWindow(2500)).toBe(200);
    expect(ratingWindow(4999)).toBe(300);
  });
  it("caps at 5 seconds", () => {
    expect(ratingWindow(5000)).toBe(350);
    expect(ratingWindow(60_000)).toBe(350);
  });
  it("falls back to a bot at 5s", () => {
    expect(shouldFallBackToBot(4_999)).toBe(false);
    expect(shouldFallBackToBot(5_000)).toBe(true);
  });
  it("pairs only inside the window", () => {
    const now = 10_000;
    const a = { userId: "a", rating: 1000, joinedAt: now };
    expect(canPair(a, { userId: "b", rating: 1100, joinedAt: now }, now)).toBe(true);
    expect(canPair(a, { userId: "b", rating: 1101, joinedAt: now }, now)).toBe(false);
    // b has waited 2s → ±200
    expect(canPair(a, { userId: "b", rating: 1200, joinedAt: now - 2_000 }, now)).toBe(true);
    expect(canPair(a, a, now)).toBe(false);
  });
  it("pairQueue picks closest partners and reports timeouts", () => {
    const now = 20_000;
    const { pairs, timedOut } = pairQueue(
      [
        { userId: "a", rating: 1000, joinedAt: now - 100 },
        { userId: "b", rating: 1090, joinedAt: now - 50 },
        { userId: "c", rating: 1010, joinedAt: now - 10 },
        { userId: "d", rating: 2000, joinedAt: now - 6_000 },
      ],
      now,
    );
    expect(pairs.map(([x, y]) => [x.userId, y.userId])).toEqual([["a", "c"]]);
    expect(timedOut.map((e) => e.userId)).toEqual(["d"]);
  });
});

describe("question selection", () => {
  it("maps average rating to difficulty", () => {
    expect(targetDifficulty(1000)).toBe(2);
    expect(targetDifficulty(1400)).toBe(3);
    expect(targetDifficulty(1800)).toBe(4);
    expect(targetDifficulty(2200)).toBe(5);
    expect(targetDifficulty(3000)).toBe(5);
    expect(targetDifficulty(500)).toBe(1);
  });

  const pool: CandidateQuestion[] = [];
  for (const cat of ["c1", "c2", "c3", "c4"]) for (let d = 1; d <= 5; d++) for (let i = 0; i < 4; i++) pool.push({ id: `${cat}-${d}-${i}`, categoryId: cat, difficulty: d });

  it("only uses allowed categories, spreads evenly and never duplicates", () => {
    const qs = selectQuestions(pool, { categories: ["c1", "c2", "c3"], avgRating: 1400, recentlySeen: new Set(), rand: seq(0.3, 0.7, 0.1) });
    expect(qs).toHaveLength(7);
    expect(new Set(qs.map((q) => q.id)).size).toBe(7);
    expect(qs.every((q) => q.categoryId !== "c4")).toBe(true);
    const counts = ["c1", "c2", "c3"].map((c) => qs.filter((q) => q.categoryId === c).length).sort();
    expect(counts).toEqual([2, 2, 3]);
  });

  it("prefers the target difficulty", () => {
    const qs = selectQuestions(pool, { categories: ["c1", "c2", "c3"], avgRating: 1800, recentlySeen: new Set(), rand: seq(0.5) });
    expect(qs.every((q) => Math.abs(q.difficulty - 4) <= 1)).toBe(true);
    expect(qs.filter((q) => q.difficulty === 4).length).toBeGreaterThanOrEqual(7 - 0);
  });

  it("avoids recently seen questions when possible", () => {
    const seen = new Set(pool.filter((q) => q.difficulty === 3).map((q) => q.id));
    const qs = selectQuestions(pool, { categories: ["c1", "c2", "c3"], avgRating: 1400, recentlySeen: seen, rand: seq(0.5) });
    expect(qs.some((q) => seen.has(q.id))).toBe(false);
  });

  it("falls back to seen questions when the pool is exhausted", () => {
    const small = pool.filter((q) => q.difficulty === 3 && q.categoryId !== "c4");
    const qs = selectQuestions(small, { categories: ["c1", "c2", "c3"], avgRating: 1400, recentlySeen: new Set(small.map((q) => q.id)), rand: seq(0.5) });
    expect(qs).toHaveLength(7);
  });

  it("works with only two remaining categories", () => {
    const qs = selectQuestions(pool, { categories: ["c1", "c2"], avgRating: 1000, recentlySeen: new Set(), rand: seq(0.2) });
    expect(qs).toHaveLength(7);
    expect(qs.filter((q) => q.categoryId === "c1").length + qs.filter((q) => q.categoryId === "c2").length).toBe(7);
  });
});

describe("progression", () => {
  it("level n needs 100 × n XP", () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(300);
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, needed: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(350)).toMatchObject({ level: 3, into: 50, needed: 300 });
  });
  it("xp and coins per result", () => {
    expect(xpFor("win", 5)).toBe(75);
    expect(xpFor("loss", 2)).toBe(30);
    expect(coinsFor("win")).toBe(30);
    expect(coinsFor("draw")).toBe(15);
    expect(coinsFor("loss")).toBe(5);
  });
  it("state points per ranked win", () => {
    expect(statePointsForWin(1500)).toBe(10);
    expect(statePointsForWin(2250)).toBe(15);
    expect(statePointsForWin(300)).toBe(5);
    expect(statePointsForWin(0)).toBe(5);
  });
});

describe("Lagos time", () => {
  it("rolls the day at midnight WAT (23:00 UTC)", () => {
    expect(lagosDate(Date.parse("2026-03-10T22:59:59Z"))).toBe("2026-03-10");
    expect(lagosDate(Date.parse("2026-03-10T23:00:00Z"))).toBe("2026-03-11");
    expect(nextLagosMidnight(Date.parse("2026-03-10T12:00:00Z"))).toBe(Date.parse("2026-03-10T23:00:00Z"));
  });
  it("weeks start on Monday", () => {
    expect(lagosWeekStart(Date.parse("2026-03-11T12:00:00Z"))).toBe("2026-03-09"); // Wed → Mon
    expect(lagosWeekStart(Date.parse("2026-03-15T22:30:00Z"))).toBe("2026-03-09"); // Sun 23:30 WAT
    expect(lagosWeekStart(Date.parse("2026-03-15T23:00:00Z"))).toBe("2026-03-16"); // Mon 00:00 WAT
  });
});

describe("bot", () => {
  it("accuracy is bounded and falls with difficulty", () => {
    expect(botAccuracy(1000, 1)).toBeGreaterThan(botAccuracy(1000, 5));
    expect(botAccuracy(5000, 1)).toBeLessThanOrEqual(0.92);
    expect(botAccuracy(0, 5)).toBeGreaterThanOrEqual(0.2);
  });
  it("answers within 2–8 seconds", () => {
    for (let i = 0; i < 200; i++) {
      const d = botDelayMs(Math.random() * 2500);
      expect(d).toBeGreaterThanOrEqual(2_000);
      expect(d).toBeLessThanOrEqual(8_000);
    }
  });
});
