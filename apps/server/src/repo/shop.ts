import { randomUUID } from "node:crypto";
import { COSMETICS, POWER_UPS, PRODUCTS, purchaseSchema, buyItemSchema, type PurchaseResponse } from "@ntc/shared";
import type { Sql } from "../db";
import { HttpError, parse } from "../api/http";
import { isPremium } from "./profiles";
import { analytics } from "../services/analytics";
import { applyPremiumPerks, grantSeasonPass } from "./premium";


export async function shopCatalog(sql: Sql, userId: string) {
  const p = await sql.one("select coins, premium_until, frame_id, button_theme_id from profiles where id = $1", [userId]);
  const inv = await sql.query<{ item_id: string; quantity: number }>("select item_id, quantity from inventory where user_id = $1 and quantity > 0", [userId]);
  const owned = Object.fromEntries(inv.map((i) => [i.item_id, i.quantity]));
  return {
    coins: p?.coins ?? 0,
    premium: { active: !!p && isPremium(p), until: p?.premium_until ? new Date(p.premium_until).toISOString() : null },
    equipped: { frameId: p?.frame_id ?? null, buttonThemeId: p?.button_theme_id ?? null },
    owned,
    powerUps: POWER_UPS.map((pu) => ({ ...pu, owned: owned[`pu_${pu.kind}`] ?? 0 })),
    cosmetics: COSMETICS.map((c) => ({ ...c, owned: !!owned[c.id] || (c.premiumOnly && !!p && isPremium(p)) })),
    products: PRODUCTS,
  };
}

/** Mock IAP: succeeds immediately after the client's confirmation sheet. Real adapters write the same rows. */
export async function purchaseProduct(sql: Sql, userId: string, raw: unknown): Promise<PurchaseResponse> {
  const body = parse(purchaseSchema, raw);
  const product = PRODUCTS.find((p) => p.id === body.productId)!;
  const res = await sql.tx(async (tx) => {
    if (product.kind === "pass") {
      const me = await tx.one("select premium_until from profiles where id = $1", [userId]);
      if (me && isPremium(me)) throw new HttpError(409, "The Season Pass is already included with your Premium.", "pass_included");
    }
    const receiptId = `mock_${randomUUID()}`;
    await tx.query("insert into purchases (user_id, product_id, platform, amount_naira, provider, receipt) values ($1, $2, $3, $4, 'mock', $5)", [
      userId,
      product.id,
      body.platform,
      product.priceNaira,
      receiptId,
    ]);
    if (product.coins) await tx.query("update profiles set coins = coins + $2 where id = $1", [userId, product.coins]);
    if (product.premiumDays) {
      await tx.query(
        "update profiles set premium_until = greatest(coalesce(premium_until, now()), now()) + ($2 || ' days')::interval where id = $1",
        [userId, String(product.premiumDays)],
      );
    }
    if (product.kind === "pass") await grantSeasonPass(tx, userId);
    const p = await tx.one("select coins, premium_until from profiles where id = $1", [userId]);
    analytics.track(userId, "purchase_completed", { productId: product.id, naira: product.priceNaira, provider: "mock" });
    return { ok: true as const, productId: product.id, coins: p!.coins, premiumUntil: p!.premium_until ? new Date(p!.premium_until).toISOString() : null, receiptId };
  });
  if (!product.premiumDays) return res;
  // New or renewed Premium: pay any perks that are due right away.
  const premiumPerks = await applyPremiumPerks(sql, userId);
  const after = await sql.one<{ coins: number }>("select coins from profiles where id = $1", [userId]);
  return { ...res, coins: after!.coins, premiumPerks };
}

export async function buyItem(sql: Sql, userId: string, raw: unknown) {
  const body = parse(buyItemSchema, raw);
  return sql.tx(async (tx) => {
    if (body.kind === "power_up") {
      const pu = POWER_UPS.find((p) => `pu_${p.kind}` === body.itemId || p.kind === body.itemId);
      if (!pu) throw new HttpError(404, "Unknown power-up");
      const paid = await tx.one("update profiles set coins = coins - $2 where id = $1 and coins >= $2 returning coins", [userId, pu.cost]);
      if (!paid) throw new HttpError(402, `You need ${pu.cost} coins.`, "insufficient_coins");
      await tx.query(
        `insert into inventory (user_id, item_id, kind, quantity) values ($1, $2, 'power_up', 1)
         on conflict (user_id, item_id) do update set quantity = inventory.quantity + 1, updated_at = now()`,
        [userId, `pu_${pu.kind}`],
      );
      return { coins: paid.coins, itemId: `pu_${pu.kind}` };
    }
    const c = COSMETICS.find((x) => x.id === body.itemId);
    if (!c) throw new HttpError(404, "Unknown item");
    if (c.premiumOnly) throw new HttpError(403, "This frame is included with Premium.", "premium_only");
    if (c.leagueReward) throw new HttpError(403, "This frame is earned by finishing a season in its league.", "league_reward");
    const has = await tx.one("select 1 from inventory where user_id = $1 and item_id = $2 and quantity > 0", [userId, c.id]);
    if (has) throw new HttpError(409, "You already own this.");
    const paid = await tx.one("update profiles set coins = coins - $2 where id = $1 and coins >= $2 returning coins", [userId, c.cost]);
    if (!paid) throw new HttpError(402, `You need ${c.cost} coins.`, "insufficient_coins");
    await tx.query("insert into inventory (user_id, item_id, kind, quantity) values ($1, $2, 'cosmetic', 1)", [userId, c.id]);
    return { coins: paid.coins, itemId: c.id };
  });
}

export async function equipItem(sql: Sql, userId: string, itemId: string) {
  const c = COSMETICS.find((x) => x.id === itemId);
  if (!c) throw new HttpError(404, "Unknown item");
  const p = await sql.one("select premium_until from profiles where id = $1", [userId]);
  const owned = c.premiumOnly ? !!p && isPremium(p) : !!(await sql.one("select 1 from inventory where user_id = $1 and item_id = $2 and quantity > 0", [userId, c.id]));
  if (!owned) throw new HttpError(403, "You don't own this yet.");
  const col = c.kind === "frame" ? "frame_id" : "button_theme_id";
  await sql.query(`update profiles set ${col} = $2 where id = $1`, [userId, c.id]);
}
