import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { verifyToken, ensureProfile, promoteListedAdmin, AuthError, type AuthUser } from "../auth";
import { getDb, type Sql } from "../db";
import { errors } from "../services/errors";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export interface Ctx {
  req: Request;
  res: Response;
  user: AuthUser;
  sql: Sql;
}

const bearer = (req: Request) => req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? null;

/** Wrap an authenticated JSON handler. */
export function authed(fn: (ctx: Ctx) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await verifyToken(bearer(req));
      const sql = await getDb();
      await ensureProfile(sql, user);
      const out = await fn({ req, res, user, sql });
      if (!res.headersSent) res.json(out ?? { ok: true });
    } catch (e) {
      next(e);
    }
  };
}

/** Admin-only handler (profiles.is_admin, or a confirmed email listed in ADMIN_EMAILS). */
export function admin(fn: (ctx: Ctx) => Promise<unknown>): RequestHandler {
  return authed(async (ctx) => {
    const r = await ctx.sql.one("select is_admin from profiles where id = $1", [ctx.user.userId]);
    if (!r?.is_admin && !(await promoteListedAdmin(ctx.sql, ctx.user.userId))) throw new HttpError(403, "Admins only");
    return fn(ctx);
  });
}

export function open(fn: (ctx: Omit<Ctx, "user"> & { user: AuthUser | null }) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      let user: AuthUser | null = null;
      const token = bearer(req);
      if (token) user = await verifyToken(token).catch(() => null);
      const sql = await getDb();
      const out = await fn({ req, res, user, sql });
      if (!res.headersSent) res.json(out ?? { ok: true });
    } catch (e) {
      next(e);
    }
  };
}

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new HttpError(400, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", "validation");
  }
  return r.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AuthError) return void res.status(401).json({ error: err.message, code: "unauthorized" });
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message, code: err.code });
  errors.capture(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again.", code: "server" });
}
