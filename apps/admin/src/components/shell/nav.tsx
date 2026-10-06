"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Inbox, Flag, Upload, ShieldAlert, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const ITEMS: { href: string; label: string; icon: LucideIcon; badge?: "review" | "reports" }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/questions", label: "Questions", icon: ListChecks },
  { href: "/review", label: "Review queue", icon: Inbox, badge: "review" },
  { href: "/reports", label: "Reports", icon: Flag, badge: "reports" },
  { href: "/import", label: "CSV import", icon: Upload },
  { href: "/fair-play", label: "Fair play", icon: ShieldAlert },
];

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api("/admin/stats"), refetchInterval: 60_000 });
  const counts = { review: stats.data?.totals?.in_review ?? 0, reports: stats.data?.totals?.open_reports ?? 0 };
  return (
    <nav className="grid gap-1">
      {ITEMS.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        const n = it.badge ? counts[it.badge] : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <it.icon className="size-4.5" />
            <span className="flex-1">{it.label}</span>
            {n > 0 ? <span className={cn("tabular rounded-full px-2 py-0.5 text-xs", it.badge === "reports" ? "bg-destructive/15 text-destructive" : "bg-gold-soft text-gold")}>{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
