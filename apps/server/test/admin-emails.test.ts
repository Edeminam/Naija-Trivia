import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser, promoteListedAdmin } from "../src/auth";

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
}, 60_000);

async function user(email: string, confirmed: boolean) {
  const id = await createDevUser(sql, { guest: false });
  await sql.query("update auth.users set email = $2, email_confirmed_at = case when $3 then now() end where id = $1", [id, email, confirmed]);
  return id;
}

const isAdmin = async (id: string) => !!(await sql.one<{ is_admin: boolean }>("select is_admin from profiles where id = $1", [id]))?.is_admin;

describe("ADMIN_EMAILS", () => {
  it("promotes a confirmed email on the list, ignoring case", async () => {
    const id = await user("Boss@Example.com", true);
    expect(await promoteListedAdmin(sql, id, ["boss@example.com"])).toBe(true);
    expect(await isAdmin(id)).toBe(true);
  });

  it("ignores unconfirmed emails, emails not on the list, and an empty list", async () => {
    const unconfirmed = await user("boss2@example.com", false);
    const other = await user("someone@example.com", true);
    expect(await promoteListedAdmin(sql, unconfirmed, ["boss2@example.com"])).toBe(false);
    expect(await promoteListedAdmin(sql, other, ["boss@example.com"])).toBe(false);
    expect(await promoteListedAdmin(sql, other, [])).toBe(false);
    expect(await isAdmin(unconfirmed)).toBe(false);
    expect(await isAdmin(other)).toBe(false);
  });
});
