"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Archive, RotateCcw, CheckCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, CategoryPill, StatusBadge, EmptyBox, ErrorBox } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const q = useQuery({ queryKey: ["reports", tab], queryFn: () => api(`/admin/reports?status=${tab}`) });
  const act = useMutation({
    mutationFn: (v: { id: string; action: "dismiss" | "retire" | "reactivate" | "fixed" }) => api(`/admin/reports/${v.id}/resolve`, { body: { action: v.action } }),
    onSuccess: (_r, v) => {
      toast.success({ dismiss: "Reports dismissed", retire: "Question retired", reactivate: "Question back live", fixed: "Marked fixed" }[v.action]);
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      void qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const d = q.data;
  return (
    <>
      <PageHeader title="Reports" description={`Grouped by question. Questions with ${d?.autoPauseAt ?? 5}+ reports are paused automatically.`} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "open" | "resolved")} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>
      {q.isError ? (
        <Card><ErrorBox error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !d ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : d.groups.length === 0 ? (
        <Card><EmptyBox icon={ShieldCheck} title={tab === "open" ? "No open reports" : "Nothing resolved yet"} body="Players can report a question from the reveal or result screen." /></Card>
      ) : (
        <div className="grid gap-3">
          {d.groups.map((g: any) => (
            <Card key={g.questionId}>
              <CardContent className="grid gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryPill slug={g.category} />
                  <StatusBadge status={g.status} />
                  <span className="tabular rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-semibold text-destructive">{g.openReports} report{g.openReports === 1 ? "" : "s"}</span>
                  <span className="text-xs text-muted-foreground">last {new Date(g.lastReportAt).toLocaleString()}</span>
                </div>
                <p className="font-medium">{g.text}</p>
                <div className="flex flex-wrap gap-2">
                  {g.reasons.map((r: any) => (
                    <div key={r.reason} className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                      <span className="font-medium">{r.label}</span> <span className="tabular text-muted-foreground">×{r.count}</span>
                      {r.notes.map((n: string, i: number) => <p key={i} className="mt-1 max-w-md text-xs text-muted-foreground">“{n}”</p>)}
                    </div>
                  ))}
                </div>
                {tab === "open" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/questions/${g.questionId}`} />}><Pencil /> Edit question</Button>
                    <Button size="sm" variant="outline" onClick={() => act.mutate({ id: g.questionId, action: "fixed" })}><CheckCheck /> Mark fixed</Button>
                    {g.status === "paused" ? <Button size="sm" variant="outline" onClick={() => act.mutate({ id: g.questionId, action: "reactivate" })}><RotateCcw /> Reactivate</Button> : null}
                    <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: g.questionId, action: "dismiss" })}>Dismiss</Button>
                    <Button size="sm" variant="destructive" onClick={() => act.mutate({ id: g.questionId, action: "retire" })}><Archive /> Retire</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
