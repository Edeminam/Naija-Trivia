"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatCard, ErrorBox, CategoryPill, Difficulty } from "@/components/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ContentHealth {
  target: number;
  nextDrop: string;
  weeks: { weekStart: string; released: number; scheduled: number; current: boolean }[];
  reviewQueue: number;
  repeatRate7d: number | null;
  activePlayers30d: number;
  categories: { slug: string; name: string; tint: string; live: number; scheduled: number; inReview: number; avgShown: number; answers7d: number; repeatRate7d: number | null }[];
  mostSeen: { id: string; text: string; category: string; timesShown: number; difficulty: number; seenBy30d: number }[];
}

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const weekLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Above this share of answers being repeats, a category needs fresh questions soon. */
const REPEAT_WARN = 0.15;

export default function Content() {
  const q = useQuery({ queryKey: ["content"], queryFn: () => api<ContentHealth>("/admin/content") });
  const d = q.data;
  const thisWeek = d?.weeks.find((w) => w.current);
  const max = d ? Math.max(d.target, ...d.weeks.map((w) => w.released + w.scheduled), 1) : 1;
  return (
    <>
      <PageHeader
        title="Content pipeline"
        description="Keep a steady weekly flow of new questions, and spot categories players are running through."
        actions={<Button nativeButton={false} render={<Link href="/review" />}>Review queue <ArrowRight /></Button>}
      />
      {q.isError ? (
        <Card><ErrorBox error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="This week"
              value={`${(thisWeek?.released ?? 0) + (thisWeek?.scheduled ?? 0)} / ${d.target}`}
              tone={(thisWeek?.released ?? 0) + (thisWeek?.scheduled ?? 0) >= d.target ? "green" : "gold"}
              hint="Released + scheduled vs weekly target"
            />
            <StatCard label="Next drop" value={new Date(d.nextDrop).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} hint={`${d.weeks.find((w) => w.weekStart === d.nextDrop.slice(0, 10))?.scheduled ?? 0} questions scheduled`} />
            <StatCard label="Review queue" value={d.reviewQueue} tone={d.reviewQueue ? "gold" : undefined} hint="Approve now or for the next drop" />
            <StatCard label="Repeat rate (7d)" value={pct(d.repeatRate7d)} tone={d.repeatRate7d != null && d.repeatRate7d > REPEAT_WARN ? "red" : "green"} hint="Answers to a question the player had seen before" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly releases</CardTitle>
              <CardDescription>Questions going live each week (Monday drops, Lagos time). The dashed line is the target of {d.target}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative flex h-48 items-end gap-3" role="img" aria-label={d.weeks.map((w) => `${weekLabel(w.weekStart)}: ${w.released} released, ${w.scheduled} scheduled`).join("; ")}>
                <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gold" style={{ bottom: `${(d.target / max) * 150 + 22}px` }} />
                {d.weeks.map((w) => (
                  <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                    <span className="tabular text-[11px] text-muted-foreground">{w.released + w.scheduled || ""}</span>
                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md" style={{ height: `${((w.released + w.scheduled) / max) * 150 + 2}px` }}>
                      <div className="w-full bg-primary/35" style={{ height: `${(w.scheduled / Math.max(w.released + w.scheduled, 1)) * 100}%` }} />
                      <div className="w-full bg-primary" style={{ height: `${(w.released / Math.max(w.released + w.scheduled, 1)) * 100}%` }} />
                    </div>
                    <span className={`tabular text-[11px] ${w.current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{weekLabel(w.weekStart)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Released</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/35" />Scheduled</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
              <CardDescription>A high repeat rate means players are meeting questions they&apos;ve already answered. Prioritise those categories.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2 pr-3 font-medium">Category</th><th className="px-3 font-medium text-right">Live</th><th className="px-3 font-medium text-right">Scheduled</th><th className="px-3 font-medium text-right">In review</th><th className="px-3 font-medium text-right">Avg plays</th><th className="px-3 font-medium text-right">Answers 7d</th><th className="pl-3 font-medium text-right">Repeats 7d</th></tr>
                </thead>
                <tbody className="divide-y">
                  {[...d.categories].sort((a, b) => (b.repeatRate7d ?? -1) - (a.repeatRate7d ?? -1)).map((c) => (
                    <tr key={c.slug}>
                      <td className="py-2.5 pr-3"><CategoryPill slug={c.slug} /></td>
                      <td className="tabular px-3 text-right">{c.live}</td>
                      <td className="tabular px-3 text-right">{c.scheduled || "—"}</td>
                      <td className="tabular px-3 text-right">{c.inReview || "—"}</td>
                      <td className="tabular px-3 text-right">{c.avgShown.toFixed(1)}</td>
                      <td className="tabular px-3 text-right">{c.answers7d.toLocaleString()}</td>
                      <td className={`tabular pl-3 text-right font-medium ${c.repeatRate7d != null && c.repeatRate7d > REPEAT_WARN ? "text-destructive" : ""}`}>{pct(c.repeatRate7d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most-played questions</CardTitle>
              <CardDescription>Candidates to retire or rewrite once {d.activePlayers30d.toLocaleString()} active players have mostly seen them.</CardDescription>
            </CardHeader>
            <CardContent>
              {d.mostSeen.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Not enough plays yet.</p>
              ) : (
                <ul className="divide-y">
                  {d.mostSeen.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <CategoryPill slug={m.category} />
                      <Link href={`/questions/${m.id}`} className="flex-1 truncate hover:underline">{m.text}</Link>
                      <Difficulty value={m.difficulty} />
                      <span className="tabular w-28 text-right text-muted-foreground">{m.timesShown.toLocaleString()} plays</span>
                      <span className="tabular w-32 text-right text-muted-foreground">{d.activePlayers30d ? pct(m.seenBy30d / d.activePlayers30d) : "—"} of players</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
