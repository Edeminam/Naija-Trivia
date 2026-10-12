import { PREMIUM_MONTHLY_COINS, PREMIUM_STIPEND_DAYS, POWER_UPS, type PremiumPerksGranted } from "@ntc/shared";
import type { Sql } from "../db";
import { currentSeason } from "./seasons";

/** Season Pass: 3 of every power-up plus the season frame. */
export const SEASON_PASS_POWERUPS = 3;
export const SEASON_PASS_FRAME = "frame_eko";

export async function grantSeasonPass(sql: Sql, userId: string) {
  for (const pu of POWER_UPS) {
    await sql.query(
      `insert into inventory (user_id, item_id, kind, quantity) values ($1, $2, 'power_up', $3)
       on conflict (user_id, item_id) do update set quantity = inventory.quantity + $3, updated_at = now()`,
      [userId, `pu_${pu.kind}`, SEASON_PASS_POWERUPS],
    );
  }
  await sql.query("insert into inventory (user_id, item_id, kind, quantity) values ($1, $2, 'cosmetic', 1) on conflict (user_id, item_id) do nothing", [userId, SEASON_PASS_FRAME]);
}

/**
 * Pay any Premium perks that are due (idempotent, safe to call on every visit):
 * coins once every PREMIUM_STIPEND_DAYS, and this season's Season Pass once per season.
 */
export async function applyPremiumPerks(sql: Sql, userId: string): Promise<PremiumPerksGranted | null> {
  const season = await currentSeason(sql);
  return sql.tx(async (tx) => {
    const p = await tx.one(
      "select premium_until, premium_stipend_at, premium_pass_season from profiles where id = $1 and premium_until > now() for update",
      [userId],
    );
    if (!p) return null;
    let coins = 0;
    let seasonPass = false;
    const due = !p.premium_stipend_at || Date.now() - new Date(p.premium_stipend_at).getTime() >= PREMIUM_STIPEND_DAYS * 86_400_000;
    if (due) {
      await tx.query("update profiles set coins = coins + $2, premium_stipend_at = now(), updated_at = now() where id = $1", [userId, PREMIUM_MONTHLY_COINS]);
      coins = PREMIUM_MONTHLY_COINS;
    }
    if (p.premium_pass_season !== season.number) {
      await grantSeasonPass(tx, userId);
      await tx.query("update profiles set premium_pass_season = $2 where id = $1", [userId, season.number]);
      seasonPass = true;
    }
    return coins || seasonPass ? { coins, seasonPass } : null;
  });
}
