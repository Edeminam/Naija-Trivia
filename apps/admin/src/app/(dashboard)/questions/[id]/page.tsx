"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminQuestion } from "@/lib/types";
import { PageHeader, ErrorBox, StatusBadge, StatCard } from "@/components/admin";
import { QuestionEditor } from "@/components/question-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { REPORT_REASONS } from "@ntc/shared";

export default function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["question", id], queryFn: () => api<AdminQuestion>(`/admin/questions/${id}`) });
  const d = q.data;
  return (
    <>
      <PageHeader title="Edit question" description={d ? `Created ${new Date(d.createdAt).toLocaleDateString()}${d.authorName ? ` by ${d.authorName}` : ""}${d.reviewerName ? ` · reviewed by ${d.reviewerName}` : ""}` : undefined} actions={d ? <StatusBadge status={d.status} /> : null} />
      {q.isError ? (
        <Card><ErrorBox error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !d ? (
        <Skeleton className="h-[520px] rounded-2xl" />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Times shown" value={d.timesShown} />
            <StatCard label="% correct" value={d.accuracy == null ? "—" : `${Math.round(d.accuracy * 100)}%`} tone="green" />
            <StatCard label="Avg answer time" value={d.timesShown ? `${(d.avgMs / 1000).toFixed(1)}s` : "—"} />
            <StatCard label="Reports" value={d.reportCount} tone={d.reportCount ? "red" : undefined} />
          </div>
          {d.reviewerNotes ? <div className="rounded-xl border bg-gold-soft p-3 text-sm"><span className="font-medium">Reviewer notes: </span>{d.reviewerNotes}</div> : null}
          <QuestionEditor key={d.updatedAt} initial={d} />
          {d.reports?.length ? (
            <Card>
              <CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {d.reports.map((r, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                      <span><span className="font-medium">{REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? r.reason}</span>{r.note ? <span className="text-muted-foreground"> — “{r.note}”</span> : null}</span>
                      <span className="text-xs text-muted-foreground">{r.status} · {new Date(r.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
