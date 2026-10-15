import { Router } from "express";
import { z } from "zod";
import { questionInputSchema, questionStatusSchema, CATEGORIES, AUTO_PAUSE_REPORT_COUNT, REPORT_REASONS, CONTENT_WEEKLY_TARGET, nextContentDrop, lagosWeekStart, addDays } from "@ntc/shared";
import { admin, parse, HttpError } from "./http";
import type { Sql } from "../db";

export const adminApi = Router();

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().optional(),
  status: questionStatusSchema.optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  sort: z.enum(["newest", "reports", "shown", "accuracy"]).default("newest"),
});

const ORDER: Record<string, string> = {
  newest: "q.created_at desc",
  reports: "q.report_count desc, q.created_at desc",
  shown: "q.times_shown desc",
  accuracy: "(case when q.times_shown > 0 then q.times_correct::float / q.times_shown end) asc nulls last",
};

function toQuestion(r: any) {
  return {
    id: r.id,
    category: r.slug,
    text: r.text,
    options: typeof r.options === "string" ? JSON.parse(r.options) : r.options,
    correctIndex: r.correct_index,
    difficulty: r.difficulty,
    fact: r.fact,
    sourceUrl: r.source_url,
    imageUrl: r.image_url,
    status: r.status,
    timesShown: r.times_shown,
    timesCorrect: r.times_correct,
    accuracy: r.times_shown ? r.times_correct / r.times_shown : null,
    avgMs: r.avg_ms,
    reportCount: r.report_count,
    reviewerNotes: r.reviewer_notes,
    authorName: r.author_name ?? null,
    reviewerName: r.reviewer_name ?? null,
    releaseAt: r.release_at ? new Date(r.release_at).toISOString() : null,
    scheduled: !!r.release_at && new Date(r.release_at).getTime() > Date.now(),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const SELECT = `select q.*, c.slug, a.username as author_name, rv.username as reviewer_name
  from questions q join categories c on c.id = q.category_id
  left join profiles a on a.id = q.author_id left join profiles rv on rv.id = q.reviewer_id`;

async function categoryId(sql: Sql, slug: string) {
  const c = await sql.one<{ id: string }>("select id from categories where slug = $1", [slug]);
  if (!c) throw new HttpError(400, `Unknown category ${slug}`);
  return c.id;
}

adminApi.get(
  "/admin/me",
  admin(async ({ sql, user }) => sql.one("select id, username, is_admin from profiles where id = $1", [user.userId])),
);

adminApi.get(
  "/admin/questions",
  admin(async ({ req, sql }) => {
    const f = parse(listQuery, req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (cond: string, v: unknown) => {
      params.push(v);
      where.push(cond.replace("$?", `$${params.length}`));
    };
    if (f.q) add("(q.text ilike $? or q.fact ilike $? or q.options::text ilike $?)".replace(/\$\?/g, () => `$${params.length + 1}`), `%${f.q}%`);
    if (f.category) add("c.slug = $?", f.category);
    if (f.status) add("q.status = $?::question_status", f.status);
    if (f.difficulty) add("q.difficulty = $?", f.difficulty);
    const w = where.length ? `where ${where.join(" and ")}` : "";
    const total = await sql.one<{ n: number }>(`select count(*)::int as n from questions q join categories c on c.id = q.category_id ${w}`, params);
    const rows = await sql.query(`${SELECT} ${w} order by ${ORDER[f.sort]} limit ${f.pageSize} offset ${(f.page - 1) * f.pageSize}`, params);
    return { items: rows.map(toQuestion), total: total?.n ?? 0, page: f.page, pageSize: f.pageSize };
  }),
);

adminApi.get(
  "/admin/questions/:id",
  admin(async ({ req, sql }) => {
    const r = await sql.one(`${SELECT} where q.id = $1`, [String(req.params.id)]);
    if (!r) throw new HttpError(404, "Question not found");
    const reports = await sql.query("select reason, note, status, created_at from question_reports where question_id = $1 order by created_at desc limit 50", [r.id]);
    return { ...toQuestion(r), reports };
  }),
);

adminApi.post(
  "/admin/questions",
  admin(async ({ req, sql, user }) => {
    const q = parse(questionInputSchema, req.body);
    const row = await sql.one(
      `insert into questions (category_id, text, options, correct_index, difficulty, fact, source_url, image_url, status, author_id)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9::question_status, $10) returning id`,
      [await categoryId(sql, q.category), q.text, JSON.stringify(q.options), q.correctIndex, q.difficulty, q.fact, q.sourceUrl, q.imageUrl ?? null, q.status, user.userId],
    );
    return { id: row!.id };
  }),
);

adminApi.put(
  "/admin/questions/:id",
  admin(async ({ req, sql }) => {
    const q = parse(questionInputSchema, req.body);
    const r = await sql.one(
      `update questions set category_id = $2, text = $3, options = $4::jsonb, correct_index = $5, difficulty = $6, fact = $7, source_url = $8, image_url = $9,
              status = $10::question_status, updated_at = now() where id = $1 returning id`,
      [String(req.params.id), await categoryId(sql, q.category), q.text, JSON.stringify(q.options), q.correctIndex, q.difficulty, q.fact, q.sourceUrl, q.imageUrl ?? null, q.status],
    );
    if (!r) throw new HttpError(404, "Question not found");
    return { id: r.id };
  }),
);

adminApi.patch(
  "/admin/questions/:id/status",
  admin(async ({ req, sql, user }) => {
    const body = parse(z.object({ status: questionStatusSchema, notes: z.string().max(500).optional() }), req.body);
    const r = await sql.one(
      `update questions set status = $2::question_status, reviewer_notes = coalesce($3, reviewer_notes),
          reviewer_id = case when $2 in ('live', 'retired') then $4::uuid else reviewer_id end, updated_at = now()
        where id = $1 returning id, status`,
      [String(req.params.id), body.status, body.notes ?? null, user.userId],
    );
    if (!r) throw new HttpError(404, "Question not found");
    return r;
  }),
);

adminApi.post(
  "/admin/review/:id",
  admin(async ({ req, sql, user }) => {
    const body = parse(
      z.object({ decision: z.enum(["approve", "reject"]), notes: z.string().max(500).optional(), schedule: z.boolean().default(false) }),
      req.body,
    );
    // Approving records when it goes live: now, or the next weekly drop when scheduled.
    const releaseAt = body.decision === "approve" ? (body.schedule ? nextContentDrop() : new Date().toISOString()) : null;
    const r = await sql.one(
      `update questions set status = $2::question_status, reviewer_id = $3, reviewer_notes = $4, release_at = $5::timestamptz, updated_at = now()
        where id = $1 and status = 'in_review' returning id, status, release_at`,
      [String(req.params.id), body.decision === "approve" ? "live" : "draft", user.userId, body.notes ?? null, releaseAt],
    );
    if (!r) throw new HttpError(409, "This question is no longer in review");
    return r;
  }),
);

adminApi.post(
  "/admin/import",
  admin(async ({ req, sql, user }) => {
    const body = parse(z.object({ rows: z.array(z.unknown()).min(1).max(1000), status: z.enum(["draft", "in_review"]).default("in_review") }), req.body);
    const results: { row: number; ok: boolean; id?: string; error?: string }[] = [];
    const cats = new Map((await sql.query<{ id: string; slug: string }>("select id, slug from categories")).map((c) => [c.slug, c.id]));
    for (const [i, raw] of body.rows.entries()) {
      const r = questionInputSchema.safeParse({ ...(raw as object), status: body.status });
      if (!r.success) {
        const issue = r.error.issues[0];
        results.push({ row: i + 1, ok: false, error: `${issue?.path.join(".") || "row"}: ${issue?.message}` });
        continue;
      }
      const q = r.data;
      const dup = await sql.one("select id from questions where lower(text) = lower($1)", [q.text]);
      if (dup) {
        results.push({ row: i + 1, ok: false, error: "Duplicate of an existing question" });
        continue;
      }
      const ins = await sql.one(
        `insert into questions (category_id, text, options, correct_index, difficulty, fact, source_url, status, author_id)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::question_status, $9) returning id`,
        [cats.get(q.category), q.text, JSON.stringify(q.options), q.correctIndex, q.difficulty, q.fact, q.sourceUrl, q.status, user.userId],
      );
      results.push({ row: i + 1, ok: true, id: ins!.id });
    }
    return { imported: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }),
);

adminApi.get(
  "/admin/reports",
  admin(async ({ req, sql }) => {
    const status = req.query.status === "resolved" ? "resolved" : "open";
    const rows = await sql.query(
      `select q.id, q.text, q.status, q.report_count, c.slug, count(r.id)::int as open_reports, max(r.created_at) as last_report_at
         from question_reports r join questions q on q.id = r.question_id join categories c on c.id = q.category_id
        where r.status = $1
        group by q.id, q.text, q.status, q.report_count, c.slug
        order by count(r.id) desc, max(r.created_at) desc
        limit 200`,
      [status],
    );
    const ids = rows.map((r) => r.id);
    const reasons = ids.length
      ? await sql.query(
          `select question_id, reason, count(*)::int as n, array_remove(array_agg(note order by created_at desc), null) as notes
             from question_reports where question_id = any($1::uuid[]) and status = $2 group by question_id, reason`,
          [`{${ids.join(",")}}`, status],
        )
      : [];
    return {
      autoPauseAt: AUTO_PAUSE_REPORT_COUNT,
      groups: rows.map((r) => ({
        questionId: r.id,
        text: r.text,
        category: r.slug,
        status: r.status,
        reportCount: r.report_count,
        openReports: r.open_reports,
        lastReportAt: new Date(r.last_report_at).toISOString(),
        reasons: reasons
          .filter((x) => x.question_id === r.id)
          .map((x) => ({ reason: x.reason, label: REPORT_REASONS.find((rr) => rr.id === x.reason)?.label ?? x.reason, count: x.n, notes: (x.notes ?? []).slice(0, 3) })),
      })),
    };
  }),
);

adminApi.post(
  "/admin/reports/:questionId/resolve",
  admin(async ({ req, sql, user }) => {
    const body = parse(z.object({ action: z.enum(["dismiss", "retire", "reactivate", "fixed"]) }), req.body);
    const id = String(req.params.questionId);
    return sql.tx(async (tx) => {
      const reportStatus = body.action === "dismiss" ? "dismissed" : "resolved";
      await tx.query("update question_reports set status = $2 where question_id = $1 and status = 'open'", [id, reportStatus]);
      if (body.action === "retire") await tx.query("update questions set status = 'retired', reviewer_id = $2, updated_at = now() where id = $1", [id, user.userId]);
      if (body.action === "reactivate" || body.action === "fixed" || body.action === "dismiss")
        await tx.query("update questions set status = case when status = 'paused' then 'live'::question_status else status end, report_count = 0, reviewer_id = $2, updated_at = now() where id = $1", [id, user.userId]);
      return { ok: true };
    });
  }),
);

adminApi.get(
  "/admin/stats",
  admin(async ({ sql }) => {
    const byCat = await sql.query(
      `select c.slug, q.status, q.difficulty, count(*)::int as n from questions q join categories c on c.id = q.category_id group by c.slug, q.status, q.difficulty`,
    );
    const dist = await sql.query(
      `select width_bucket(times_correct::float / nullif(times_shown, 0), 0, 1.0000001, 10) as bucket, count(*)::int as n
         from questions where times_shown >= 3 group by 1 order by 1`,
    );
    const flags = await sql.query(
      `select f.id, f.flag_date::text as date, f.fast_correct, f.status, p.id as user_id, p.username, p.state_code, p.rating, p.ranked_games
         from anticheat_flags f join profiles p on p.id = f.user_id order by (f.status = 'open') desc, f.created_at desc limit 100`,
    );
    const totals = await sql.one(
      `select (select count(*)::int from profiles where not is_guest) as players,
              (select count(*)::int from matches where created_at > now() - interval '24 hours') as matches_24h,
              (select count(*)::int from question_reports where status = 'open') as open_reports,
              (select count(*)::int from questions where status = 'in_review') as in_review,
              (select count(*)::int from questions where status = 'live' and (release_at is null or release_at <= now())) as live,
              (select count(*)::int from questions where status = 'live' and release_at > now()) as scheduled`,
    );
    const categories = CATEGORIES.map((c) => {
      const rows = byCat.filter((r) => r.slug === c.slug);
      const byStatus: Record<string, number> = {};
      const byDifficulty = [0, 0, 0, 0, 0];
      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n;
        if (r.status === "live") byDifficulty[r.difficulty - 1]! += r.n;
      }
      return { slug: c.slug, name: c.name, tint: c.tint, total: rows.reduce((a, r) => a + r.n, 0), byStatus, liveByDifficulty: byDifficulty };
    });
    const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: dist.find((d) => d.bucket === i + 1)?.n ?? 0 }));
    return { totals, categories, accuracyBuckets: buckets, flags };
  }),
);

/** Move a scheduled question to another drop, or publish it now (releaseAt: null). */
adminApi.patch(
  "/admin/questions/:id/release",
  admin(async ({ req, sql }) => {
    const body = parse(z.object({ releaseAt: z.iso.datetime({ offset: true }).nullable() }), req.body);
    const r = await sql.one(
      "update questions set release_at = coalesce($2::timestamptz, now()), updated_at = now() where id = $1 returning id, release_at",
      [String(req.params.id), body.releaseAt],
    );
    if (!r) throw new HttpError(404, "Question not found");
    return r;
  }),
);

/**
 * Content pipeline health: weekly releases against the target, what's scheduled, the review queue,
 * and how often players meet a question they've already answered (repeats) per category.
 */
adminApi.get(
  "/admin/content",
  admin(async ({ sql }) => {
    const thisWeek = lagosWeekStart();
    const from = addDays(thisWeek, -28);
    const to = addDays(thisWeek, 28);
    const weekly = await sql.query<{ week: string; released: number; scheduled: number }>(
      `select to_char(date_trunc('week', (release_at at time zone 'UTC') + interval '1 hour'), 'YYYY-MM-DD') as week,
              count(*) filter (where release_at <= now())::int as released,
              count(*) filter (where release_at > now())::int as scheduled
         from questions
        where status = 'live' and release_at >= ($1::date - interval '1 hour') and release_at < ($2::date - interval '1 hour')
        group by 1`,
      [from, to],
    );
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const week = addDays(from, 7 * i);
      const w = weekly.find((r) => r.week === week);
      return { weekStart: week, released: w?.released ?? 0, scheduled: w?.scheduled ?? 0, current: week === thisWeek };
    });
    const cats = await sql.query(
      `select c.slug,
              count(q.id) filter (where q.status = 'live' and (q.release_at is null or q.release_at <= now()))::int as live,
              count(q.id) filter (where q.status = 'live' and q.release_at > now())::int as scheduled,
              count(q.id) filter (where q.status = 'in_review')::int as in_review,
              coalesce(avg(q.times_shown) filter (where q.status = 'live'), 0)::float as avg_shown
         from categories c left join questions q on q.category_id = c.id group by c.slug`,
    );
    const repeats = await sql.query<{ slug: string; answers: number; repeats: number }>(
      `select c.slug, count(*)::int as answers,
              count(*) filter (where exists (
                select 1 from match_answers p where p.user_id = a.user_id and p.question_id = a.question_id and p.created_at < a.created_at
              ))::int as repeats
         from match_answers a join categories c on c.id = a.category_id
        where a.created_at > now() - interval '7 days'
        group by c.slug`,
    );
    const mostSeen = await sql.query(
      `select q.id, q.text, c.slug, q.times_shown, q.difficulty,
              (select count(*)::int from seen_questions s where s.question_id = q.id and s.seen_at > now() - interval '30 days') as seen_by_30d
         from questions q join categories c on c.id = q.category_id
        where q.status = 'live' and q.times_shown > 0
        order by q.times_shown desc limit 15`,
    );
    const active = await sql.one<{ n: number }>("select count(distinct user_id)::int as n from match_answers where created_at > now() - interval '30 days'");
    const totalAnswers = repeats.reduce((a, r) => a + r.answers, 0);
    const totalRepeats = repeats.reduce((a, r) => a + r.repeats, 0);
    return {
      target: CONTENT_WEEKLY_TARGET,
      nextDrop: nextContentDrop(),
      weeks,
      reviewQueue: cats.reduce((a, c) => a + c.in_review, 0),
      repeatRate7d: totalAnswers ? totalRepeats / totalAnswers : null,
      activePlayers30d: active?.n ?? 0,
      categories: CATEGORIES.map((c) => {
        const row = cats.find((r) => r.slug === c.slug);
        const rep = repeats.find((r) => r.slug === c.slug);
        return {
          slug: c.slug,
          name: c.name,
          tint: c.tint,
          live: row?.live ?? 0,
          scheduled: row?.scheduled ?? 0,
          inReview: row?.in_review ?? 0,
          avgShown: row?.avg_shown ?? 0,
          answers7d: rep?.answers ?? 0,
          repeatRate7d: rep?.answers ? rep.repeats / rep.answers : null,
        };
      }),
      mostSeen: mostSeen.map((r) => ({ id: r.id, text: r.text, category: r.slug, timesShown: r.times_shown, difficulty: r.difficulty, seenBy30d: r.seen_by_30d })),
    };
  }),
);

adminApi.post(
  "/admin/flags/:id",
  admin(async ({ req, sql }) => {
    const body = parse(z.object({ status: z.enum(["open", "cleared", "banned"]) }), req.body);
    const r = await sql.one("update anticheat_flags set status = $2 where id = $1 returning id, status", [String(req.params.id), body.status]);
    if (!r) throw new HttpError(404, "Flag not found");
    return r;
  }),
);
