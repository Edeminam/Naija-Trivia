"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ExternalLink, Pencil, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { QuestionList, AdminQuestion } from "@/lib/types";
import { PageHeader, CategoryPill, Difficulty, EmptyBox, ErrorBox, QuestionPreview } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ReviewItem({ q, onDone }: { q: AdminQuestion; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") => api(`/admin/review/${q.id}`, { body: { decision, notes: notes || undefined } }),
    onSuccess: (_r, decision) => {
      toast.success(decision === "approve" ? "Approved — now live" : "Sent back to draft");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill slug={q.category} />
            <Difficulty value={q.difficulty} />
            {q.authorName ? <span className="text-xs text-muted-foreground">by {q.authorName}</span> : null}
          </div>
          <p className="font-heading text-lg font-bold leading-snug">{q.text}</p>
          <ol className="grid gap-1 text-sm">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.correctIndex ? "font-semibold text-green-text" : "text-muted-foreground"}>{"ABCD"[i]}. {o}{i === q.correctIndex ? " ✓" : ""}</li>
            ))}
          </ol>
          <p className="text-sm"><span className="text-gold">Did you know? </span>{q.fact}</p>
          {q.sourceUrl ? <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-green-text hover:underline">Check source <ExternalLink className="size-3.5" /></a> : <p className="text-sm text-destructive">No source URL</p>}
          <Textarea rows={2} placeholder="Reviewer notes (optional, shown to the author)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Reviewer notes" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => decide.mutate("approve")} disabled={decide.isPending}><Check /> Approve & publish</Button>
            <Button variant="destructive" onClick={() => decide.mutate("reject")} disabled={decide.isPending}><X /> Reject</Button>
            <Button variant="ghost" nativeButton={false} render={<Link href={`/questions/${q.id}`} />}><Pencil /> Edit</Button>
          </div>
        </div>
        <QuestionPreview text={q.text} options={q.options} correctIndex={q.correctIndex} category={q.category} fact={q.fact} reveal />
      </CardContent>
    </Card>
  );
}

export default function Review() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["questions", "review"], queryFn: () => api<QuestionList>("/admin/questions?status=in_review&pageSize=50&sort=newest") });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["questions"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
  return (
    <>
      <PageHeader title="Review queue" description="Verify the answer against the source before approving. Approved questions go live immediately." />
      {list.isError ? (
        <Card><ErrorBox error={list.error} onRetry={() => list.refetch()} /></Card>
      ) : !list.data ? (
        <div className="grid gap-4">{[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : list.data.items.length === 0 ? (
        <Card><EmptyBox icon={PartyPopper} title="Queue cleared" body="Nothing waiting for review. New submissions and CSV imports land here." /></Card>
      ) : (
        <div className="grid gap-4">
          <p className="tabular text-sm text-muted-foreground">{list.data.total} waiting</p>
          {list.data.items.map((q) => <ReviewItem key={q.id} q={q} onDone={refresh} />)}
        </div>
      )}
    </>
  );
}
