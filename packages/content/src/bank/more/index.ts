import type { CategorySlug } from "@ntc/shared";
import type { Seed } from "../helpers";
import { footballMore } from "./football";
import { afrobeatsMore } from "./afrobeats";
import { nollywoodMore } from "./nollywood";
import { historyMore } from "./history";
import { geographyMore } from "./geography";
import { foodMore } from "./food";

/** Questions added after the original 100-per-category seed, keyed by category. */
export const MORE: Partial<Record<CategorySlug, Seed[]>> = {
  football: footballMore,
  afrobeats: afrobeatsMore,
  nollywood: nollywoodMore,
  history: historyMore,
  geography: geographyMore,
  food: foodMore,
};
