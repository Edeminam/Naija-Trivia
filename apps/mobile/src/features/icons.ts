import { Clapperboard, Music2, Trophy, Landmark, Map, ChefHat, MessageCircle, BookOpen, Bus, Cpu, HelpCircle, Split, Timer, Users, Shield, type LucideIcon } from "lucide-react-native";
import type { CategorySlug, PowerUpKind } from "@ntc/shared";

/** Explicit maps (namespace imports would bundle all ~1,500 lucide icons). */
export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  nollywood: Clapperboard,
  afrobeats: Music2,
  football: Trophy,
  history: Landmark,
  geography: Map,
  food: ChefHat,
  pidgin: MessageCircle,
  proverbs: BookOpen,
  "naija-life": Bus,
  "tech-business": Cpu,
};
export const FALLBACK_ICON = HelpCircle;

export const POWER_UP_ICONS: Record<PowerUpKind, LucideIcon> = { fifty: Split, extra_time: Timer, crowd: Users, shield: Shield };
