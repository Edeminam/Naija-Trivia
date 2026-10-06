import { readFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env";

export type Row = Record<string, any>;

export interface Sql {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  one<T extends Row = Row>(text: string, params?: unknown[]): Promise<T | null>;
  tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  /** Run a multi-statement script without parameters (migrations, seed). */
  exec(text: string): Promise<void>;
  close(): Promise<void>;
  kind: "postgres" | "pglite";
}

/** Postgres array literal for uuid[] / text[] params, e.g. pgArray(ids) + "::uuid[]". */
export function pgArray(values: readonly (string | number)[]): string {
  return `{${values.map((v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

const here = dirname(fileURLToPath(import.meta.url));
// Repo root holds /supabase; resolve from src/db (dev) or dist/ (bundled).
const repoRoot = [resolve(here, "../../../.."), resolve(here, "../../.."), process.cwd(), resolve(process.cwd(), "../..")].find((d) => existsSync(resolve(d, "supabase/migrations")))!;

function wrap(
  kind: Sql["kind"],
  run: (t: string, p: unknown[]) => Promise<Row[]>,
  begin: (fn: (s: Sql) => Promise<any>) => Promise<any>,
  exec: (t: string) => Promise<void>,
  close: () => Promise<void>,
): Sql {
  const self: Sql = {
    kind,
    query: (t, p = []) => run(t, p) as Promise<any>,
    one: async (t, p = []) => ((await run(t, p))[0] as any) ?? null,
    tx: (fn) => begin(fn),
    exec,
    close,
  };
  return self;
}

async function connectPostgres(url: string): Promise<Sql> {
  const { default: postgres } = await import("postgres");
  const pg = postgres(url, {
    max: 10,
    prepare: false, // required by Supabase's transaction pooler
    types: { bigint: postgres.BigInt },
    transform: { undefined: null },
  });
  const make = (conn: any): Sql =>
    wrap(
      "postgres",
      async (t, p) => normalize(await conn.unsafe(t, p as any[])),
      (fn) => (conn.begin ? conn.begin((tx: any) => fn(make(tx))) : fn(make(conn))),
      async (t) => {
        await conn.unsafe(t).simple();
      },
      () => pg.end(),
    );
  return make(pg);
}

async function connectPglite(dir: string): Promise<Sql> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dir !== "memory://") mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir === "memory://" ? undefined : dir);
  const make = (conn: any, root: boolean): Sql =>
    wrap(
      "pglite",
      async (t, p) => normalize((await conn.query(t, p)).rows),
      (fn) => (root ? db.transaction((tx: any) => fn(make(tx, false))) : fn(make(conn, false))),
      async (t) => {
        await conn.exec(t);
      },
      () => db.close(),
    );
  return make(db, true);
}

/** bigint → number so both drivers return the same shapes. */
function normalize(rows: Row[]): Row[] {
  for (const r of rows) for (const k in r) if (typeof r[k] === "bigint") r[k] = Number(r[k]);
  return rows;
}

const AUTH_SHIM = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  is_anonymous boolean not null default false,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now());
`;

/** Local mode only: apply the shim, every migration once, then the seed if the bank is empty. */
export async function migrateLocal(sql: Sql, log = console.log) {
  await sql.exec(AUTH_SHIM);
  const dir = resolve(repoRoot, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set((await sql.query<{ name: string }>("select name from _migrations")).map((r) => r.name));
  for (const f of files) {
    if (applied.has(f)) continue;
    log(`[db] applying ${f}`);
    await sql.exec(readFileSync(resolve(dir, f), "utf8"));
    await sql.query("insert into _migrations (name) values ($1)", [f]);
  }
  const seeded = await sql.one<{ n: number }>("select count(*)::int as n from questions");
  if (!seeded || seeded.n === 0) {
    log("[db] loading supabase/seed.sql");
    await sql.exec(readFileSync(resolve(repoRoot, "supabase/seed.sql"), "utf8"));
  }
}

let instance: Promise<Sql> | null = null;

export function getDb(): Promise<Sql> {
  if (!instance) {
    instance = (async () => {
      if (env.databaseUrl) {
        console.log("[db] connecting to Postgres (DATABASE_URL)");
        return connectPostgres(env.databaseUrl);
      }
      const dir = env.isTest ? "memory://" : env.pgliteDir;
      console.log(`[db] DATABASE_URL not set — using embedded PGlite at ${dir}`);
      const sql = await connectPglite(dir);
      await migrateLocal(sql, env.isTest ? () => {} : console.log);
      return sql;
    })();
  }
  return instance;
}

/** For tests: a fresh in-memory database with migrations + seed applied. */
export async function createTestDb(): Promise<Sql> {
  const sql = await connectPglite("memory://");
  await migrateLocal(sql, () => {});
  return sql;
}
