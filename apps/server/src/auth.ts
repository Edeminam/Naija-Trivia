import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { env } from "./env";
import type { Sql } from "./db";

export interface AuthUser {
  userId: string;
  isAnonymous: boolean;
}

const devKey = new TextEncoder().encode(env.devJwtSecret);
const supabaseKey = env.supabaseJwtSecret ? new TextEncoder().encode(env.supabaseJwtSecret) : null;
const jwks = env.supabaseUrl ? createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`)) : null;

export class AuthError extends Error {
  status = 401;
}

function toUser(p: JWTPayload): AuthUser {
  if (!p.sub) throw new AuthError("Token has no subject");
  return { userId: p.sub, isAnonymous: Boolean((p as any).is_anonymous) };
}

/** Verify a bearer token: dev tokens (local), Supabase HS256 secret, or Supabase JWKS. */
export async function verifyToken(token: string | undefined | null): Promise<AuthUser> {
  if (!token) throw new AuthError("Missing token");
  if (env.allowDevAuth) {
    try {
      const { payload } = await jwtVerify(token, devKey, { issuer: "ntc-dev" });
      return toUser(payload);
    } catch {
      /* fall through to Supabase */
    }
  }
  if (supabaseKey) {
    try {
      const { payload } = await jwtVerify(token, supabaseKey);
      return toUser(payload);
    } catch {
      /* try JWKS */
    }
  }
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks);
      return toUser(payload);
    } catch {
      /* invalid */
    }
  }
  throw new AuthError("Invalid or expired session");
}

export async function issueDevToken(userId: string, isAnonymous: boolean): Promise<string> {
  return new SignJWT({ is_anonymous: isAnonymous, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("ntc-dev")
    .setIssuedAt()
    // Without Supabase there's no password to sign back in with, so the token is the account: keep it a year.
    .setExpirationTime("365d")
    .sign(devKey);
}

/** Dev/local only: create an auth user (the profile row is created by trigger). */
export async function createDevUser(sql: Sql, opts: { guest: boolean; username?: string; admin?: boolean }) {
  if (opts.username) {
    const existing = await sql.one<{ id: string }>("select id from profiles where lower(username) = lower($1)", [opts.username]);
    if (existing) {
      if (opts.admin) await sql.query("update profiles set is_admin = true where id = $1", [existing.id]);
      return existing.id;
    }
  }
  const u = await sql.one<{ id: string }>("insert into auth.users (is_anonymous) values ($1) returning id", [opts.guest]);
  await sql.query("insert into profiles (id, is_guest) values ($1, $2) on conflict (id) do nothing", [u!.id, opts.guest]);
  if (opts.username) await sql.query("update profiles set username = $2 where id = $1", [u!.id, opts.username]);
  if (opts.admin) await sql.query("update profiles set is_admin = true, username = coalesce(username, 'admin'), state_code = coalesce(state_code, 'LA') where id = $1", [u!.id]);
  return u!.id;
}

/**
 * Make a signed-in user an admin if their confirmed email is in ADMIN_EMAILS, so the first admin
 * needs no SQL. Unconfirmed emails don't count: anyone can sign up with an address they don't own.
 */
export async function promoteListedAdmin(sql: Sql, userId: string, emails = env.adminEmails): Promise<boolean> {
  if (!emails.length) return false;
  const r = await sql.one(
    `update profiles p set is_admin = true
       from auth.users u
      where p.id = $1 and u.id = p.id and u.email_confirmed_at is not null and lower(u.email) = any($2::text[])
      returning p.id`,
    [userId, `{${emails.join(",")}}`],
  );
  return !!r;
}

/** Profiles are created by trigger, but make sure one exists (e.g. trigger missing on a fresh project). */
export async function ensureProfile(sql: Sql, user: AuthUser) {
  await sql.query("insert into profiles (id, is_guest) values ($1, $2) on conflict (id) do nothing", [user.userId, user.isAnonymous]);
  // A guest who linked a phone / Google / Apple identity keeps the same id — promote them.
  if (!user.isAnonymous) await sql.query("update profiles set is_guest = false where id = $1 and is_guest", [user.userId]);
}
