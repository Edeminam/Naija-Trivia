"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Ban, Check } from "lucide-react";
import { toast } from "sonner";
import { stateByCode } from "@ntc/shared";
import { api } from "@/lib/api";
import { PageHeader, EmptyBox, ErrorBox } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function FairPlay() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["stats"], queryFn: () => api("/admin/stats") });
  const act = useMutation({
    mutationFn: (v: { id: string; status: "cleared" | "banned" | "open" }) => api(`/admin/flags/${v.id}`, { body: { status: v.status } }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "cleared" ? "Flag cleared" : v.status === "banned" ? "Account marked banned" : "Reopened");
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const flags = q.data?.flags ?? [];
  return (
    <>
      <PageHeader title="Fair play" description="Server-side latency checks flag accounts with 10+ correct answers under 400ms in a single day." />
      <Card className="overflow-hidden p-0">
        {q.isError ? (
          <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <div className="grid gap-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : flags.length === 0 ? (
          <EmptyBox icon={ShieldCheck} title="No flagged accounts" body="Clean play all round." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Player</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Fast correct</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="pl-4 font-medium">{f.username ?? "Unknown"}</TableCell>
                  <TableCell>{stateByCode(f.state_code)?.name ?? "—"}</TableCell>
                  <TableCell className="tabular">{f.date}</TableCell>
                  <TableCell className="tabular text-right font-semibold text-destructive">{f.fast_correct}</TableCell>
                  <TableCell className="tabular text-right">{f.rating}</TableCell>
                  <TableCell><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", f.status === "open" ? "bg-gold-soft text-gold" : f.status === "banned" ? "bg-destructive/12 text-destructive" : "bg-green-soft text-green-text")}>{f.status}</span></TableCell>
                  <TableCell className="pr-4 text-right">
                    {f.status === "open" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => act.mutate({ id: f.id, status: "cleared" })}><Check /> Clear</Button>
                        <Button size="sm" variant="destructive" onClick={() => act.mutate({ id: f.id, status: "banned" })}><Ban /> Ban</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: f.id, status: "open" })}>Reopen</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
