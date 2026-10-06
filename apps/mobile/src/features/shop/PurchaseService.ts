import { Platform } from "react-native";
import { PRODUCTS, type ProductId, type PurchaseResponse } from "@ntc/shared";
import { api } from "../../lib/api";

/**
 * Purchases behind one interface. The app ships with the mock (confirmation sheet → server grants
 * the item and records a `purchases` row with provider "mock").
 *
 * Production adapters (designed, not yet wired to SDKs):
 *  - RevenueCat (Google Play Billing + Apple IAP): purchase via `Purchases.purchaseStoreProduct`, then
 *    the server receives RevenueCat's webhook and grants the item idempotently by `transaction_id`.
 *  - Paystack (web): server creates a transaction (POST /api/shop/paystack/init → authorization_url),
 *    the user pays on Paystack's hosted page, and Paystack's `charge.success` webhook grants the item.
 * Both write the same `purchases` rows, so the rest of the app doesn't change.
 */
export interface PurchaseService {
  readonly provider: "mock" | "revenuecat" | "paystack";
  /** Localised price string for display */
  priceLabel(productId: ProductId): string;
  purchase(productId: ProductId): Promise<PurchaseResponse>;
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

class MockPurchaseService implements PurchaseService {
  readonly provider = "mock" as const;
  priceLabel(id: ProductId) {
    return naira(PRODUCTS.find((p) => p.id === id)!.priceNaira);
  }
  async purchase(productId: ProductId) {
    // Simulate store latency so the UI's processing state is visible.
    await new Promise((r) => setTimeout(r, 700));
    return api.post<PurchaseResponse>("/shop/purchase", { productId, platform: Platform.OS === "web" ? "web" : Platform.OS });
  }
}

class RevenueCatPurchaseService implements PurchaseService {
  readonly provider = "revenuecat" as const;
  priceLabel(id: ProductId) {
    return naira(PRODUCTS.find((p) => p.id === id)!.priceNaira);
  }
  async purchase(_productId: ProductId): Promise<PurchaseResponse> {
    throw new Error("RevenueCat isn't configured. Set EXPO_PUBLIC_PURCHASES=mock or add the RevenueCat SDK and keys.");
  }
}

class PaystackPurchaseService implements PurchaseService {
  readonly provider = "paystack" as const;
  priceLabel(id: ProductId) {
    return naira(PRODUCTS.find((p) => p.id === id)!.priceNaira);
  }
  async purchase(_productId: ProductId): Promise<PurchaseResponse> {
    throw new Error("Paystack isn't configured. Set EXPO_PUBLIC_PURCHASES=mock or add Paystack keys on the server.");
  }
}

function pick(): PurchaseService {
  const mode = process.env.EXPO_PUBLIC_PURCHASES ?? "mock";
  if (mode === "live") return Platform.OS === "web" ? new PaystackPurchaseService() : new RevenueCatPurchaseService();
  return new MockPurchaseService();
}

export const purchases: PurchaseService = pick();
