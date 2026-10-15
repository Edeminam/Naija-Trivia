import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser } from "../src/auth";
import { getQuestions, shuffleSeeded } from "../src/repo/questions";
import { createChallenge, startChallenge, challengeTable } from "../src/repo/challenges";
import { serveNext, submitAnswer } from "../src/repo/solo";
import { pgArray } from "../src/db";

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
}, 60_000);

describe("Pidgin questions", () => {
  it("are seeded and keep the English answer positions", async () => {
    const n = await sql.one<{ n: number }>("select count(*)::int as n from question_translations where locale = 'pcm'");
    expect(n!.n).toBeGreaterThanOrEqual(100);
    const row = await sql.one<{ question_id: string }>("select question_id from question_translations where locale = 'pcm' limit 1");
    const [en] = await getQuestions(sql, [row!.question_id]);
    const [pcm] = await getQuestions(sql, [row!.question_id], "pcm");
    expect(pcm!.text).not.toBe(en!.text);
    expect(pcm!.correctIndex).toBe(en!.correctIndex);
    expect(pcm!.options).toHaveLength(4);
  });

  it("are served to players who chose Pidgin, and scored the same", async () => {
    const ids = (await sql.query<{ question_id: string }>("select question_id from question_translations where locale = 'pcm' limit 7")).map((r) => r.question_id);
    const naija = await createDevUser(sql, { guest: false, username: "pidgin_fan" });
    const plain = await createDevUser(sql, { guest: false, username: "english_fan" });
    await sql.query(`update profiles set settings = settings || '{"questionLanguage":"pcm"}'::jsonb where id = $1`, [naija]);
    const code = await createChallenge(sql, naija);
    await sql.query("update challenges set question_ids = $2::uuid[] where code = $1", [code, pgArray(ids)]);

    const [pcmQ] = await getQuestions(sql, [ids[0]!], "pcm");
    const [enQ] = await getQuestions(sql, [ids[0]!]);
    const c1 = await startChallenge(sql, code, naija);
    const served = await serveNext(sql, challengeTable(naija, c1));
    expect(served.question!.text).toBe(pcmQ!.text);
    const correctId = shuffleSeeded(pcmQ!, `${naija}:challenge`).correctOptionId;
    expect(served.question!.options.find((o) => o.id === correctId)!.text).toBe(pcmQ!.options[pcmQ!.correctIndex]);
    const r = await submitAnswer(sql, challengeTable(naija, c1), 0, correctId);
    expect(r.result).toMatchObject({ correct: true, fact: pcmQ!.fact });

    const c2 = await startChallenge(sql, code, plain);
    expect((await serveNext(sql, challengeTable(plain, c2))).question!.text).toBe(enQ!.text);
  });
});

describe("weekly content drops", () => {
  it("keeps scheduled questions out of play until their release time", async () => {
    const { questionPool, activeCategories } = await import("../src/repo/questions");
    const scheduled = await sql.one<{ id: string; category_id: string }>("select id, category_id from questions where release_at > now() limit 1");
    expect(scheduled).toBeTruthy();
    const ids = (await questionPool(sql, [scheduled!.category_id])).map((q) => q.id);
    expect(ids).not.toContain(scheduled!.id);
    await sql.query("update questions set release_at = now() - interval '1 minute' where id = $1", [scheduled!.id]);
    expect((await questionPool(sql, [scheduled!.category_id])).map((q) => q.id)).toContain(scheduled!.id);
    expect((await activeCategories(sql)).length).toBeGreaterThan(0);
  });
});
