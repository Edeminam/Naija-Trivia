"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, StatCard, ErrorBox, STATUS_LABEL } from "@/components/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const STATUS_COLOR: Record<string, string> = { live: "var(--primary)", in_review: "#E8B44A", draft: "var(--muted-foreground)", paused: "var(--destructive)", retired: "color-mix(in oklab, var(--muted-foreground) 45%, transparent)" };

export default function Overview() {
  const q = useQuery({ queryKey: ["stats"], queryFn: () => api("/admin/stats") });
  const d = q.data;
  return (
    <>
      <PageHeader title="Overview" description="Health of the question bank and the community." actions={<Button nativeButton={false} render={<Link href="/questions/new" />}>New question</Button>} />
      {q.isError ? (
        <Card><ErrorBox error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Live questions" value={d.totals.live} tone="green" />
            <StatCard label="In review" value={d.totals.in_review} tone="gold" hint="Waiting for approval" />
            <StatCard label="Open reports" value={d.totals.open_reports} tone={d.totals.open_reports ? "red" : undefined} />
            <StatCard label="Players" value={d.totals.players.toLocaleString()} hint="Signed-in accounts" />
            <StatCard label="Matches (24h)" value={d.totals.matches_24h.toLocaleString()} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Questions by category</CardTitle>
                <CardDescription>Stacked by status · live questions by difficulty on the right</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {d.categories.map((c: any) => {
                  const max = Math.max(...d.categories.map((x: any) => x.total), 1);
                  return (
                    <div key={c.slug} className="grid grid-cols-[120px_1fr_96px] items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 truncate"><span className="size-2.5 rounded-full" style={{ backgroundColor: c.tint }} />{c.name.split(" ")[0]}</div>
                      <div className="flex h-3 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(4, (c.total / max) * 100)}%` }} role="img" aria-label={`${c.name}: ${Object.entries(c.byStatus).map(([s, n]) => `${n} ${STATUS_LABEL[s as keyof typeof STATUS_LABEL]}`).join(", ") || "no questions"}`}>
                        {Object.entries(c.byStatus).map(([s, n]: any) => <div key={s} style={{ width: `${(n / Math.max(c.total, 1)) * 100}%`, backgroundColor: STATUS_COLOR[s] }} />)}
                      </div>
                      <div className="flex items-end gap-0.5" role="img" aria-label={`Live by difficulty: ${c.liveByDifficulty.join(", ")}`}>
                        {c.liveByDifficulty.map((n: number, i: number) => {
                          const m = Math.max(...c.liveByDifficulty, 1);
                          return <div key={i} title={`D${i + 1}: ${n}`} className="w-3.5 rounded-sm bg-primary/80" style={{ height: `${6 + (n / m) * 22}px`, opacity: 0.45 + i * 0.12 }} />;
                        })}
                        <span className="tabular ml-1.5 text-xs text-muted-foreground">{c.total}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
                  {Object.entries(STATUS_LABEL).map(([s, l]) => <span key={s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR[s] }} />{l}</span>)}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>% correct distribution</CardTitle>
                <CardDescription>Questions shown 3+ times. Very low or very high may need a difficulty tweak.</CardDescription>
              </CardHeader>
              <CardContent>
                {d.accuracyBuckets.every((b: any) => b.count === 0) ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Not enough plays yet.</p>
                ) : (
                  <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Histogram of percent correct">
                    {d.accuracyBuckets.map((b: any) => {
                      const m = Math.max(...d.accuracyBuckets.map((x: any) => x.count), 1);
                      return (
                        <div key={b.from} className="flex flex-1 flex-col items-center gap-1">
                          <span className="tabular text-[10px] text-muted-foreground">{b.count || ""}</span>
                          <div className="w-full rounded-t-md bg-primary" style={{ height: `${(b.count / m) * 130 + 2}px`, opacity: b.from < 20 || b.from >= 90 ? 0.55 : 1 }} />
                          <span className="tabular text-[10px] text-muted-foreground">{b.from}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fair-play flags</CardTitle>
                <CardDescription>Accounts with ≥ 10 correct answers under 400ms in a day</CardDescription>
              </div>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/fair-play" />}>Review <ArrowRight /></Button>
            </CardHeader>
            <CardContent>
              {d.flags.filter((f: any) => f.status === "open").length === 0 ? (
                <p className="text-sm text-muted-foreground">No open flags. 🎉</p>
              ) : (
                <ul className="divide-y">
                  {d.flags.filter((f: any) => f.status === "open").slice(0, 5).map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium">{f.username ?? "Unknown"}</span>
                      <span className="tabular text-muted-foreground">{f.fast_correct} fast answers · {f.date}</span>
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
