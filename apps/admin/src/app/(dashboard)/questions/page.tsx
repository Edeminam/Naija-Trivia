"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, type QuestionStatus } from "@ntc/shared";
import { api } from "@/lib/api";
import type { QuestionList } from "@/lib/types";
import { PageHeader, SimpleSelect, CategoryPill, Difficulty, EmptyBox, ErrorBox, STATUSES, STATUS_LABEL } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Sort = "newest" | "reports" | "shown" | "accuracy";

export default function Questions() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<QuestionStatus | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ page: String(page), pageSize: "25", sort });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  if (difficulty) params.set("difficulty", difficulty);
  const key = ["questions", params.toString()];
  const list = useQuery({ queryKey: key, queryFn: () => api<QuestionList>(`/admin/questions?${params}`), placeholderData: keepPreviousData });

  const setStatusM = useMutation({
    mutationFn: (v: { id: string; status: QuestionStatus }) => api(`/admin/questions/${v.id}/status`, { method: "PATCH", body: { status: v.status } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<QuestionList>(key);
      qc.setQueryData<QuestionList>(key, (old) => (old ? { ...old, items: old.items.map((i) => (i.id === v.id ? { ...i, status: v.status } : i)) } : old));
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(e.message);
    },
    onSuccess: (_r, v) => {
      toast.success(`Marked ${STATUS_LABEL[v.status].toLowerCase()}`);
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const filtered = !!(q || category || status || difficulty);

  return (
    <>
      <PageHeader title="Questions" description={d ? `${d.total.toLocaleString()} questions${filtered ? " match your filters" : " in the bank"}` : "Loading…"} actions={<Button nativeButton={false} render={<Link href="/questions/new" />}><Plus /> New question</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search text, options or facts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" aria-label="Search questions" />
        </div>
        <SimpleSelect label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))} />
        <SimpleSelect label="Status" value={status} onChange={(v) => { setStatus(v as QuestionStatus); setPage(1); }} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        <SimpleSelect label="Difficulty" value={difficulty} onChange={(v) => { setDifficulty(v); setPage(1); }} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `Difficulty ${n}` }))} className="min-w-32" />
        <SimpleSelect label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={[{ value: "newest", label: "Newest" }, { value: "reports", label: "Most reported" }, { value: "shown", label: "Most shown" }, { value: "accuracy", label: "Hardest (lowest %)" }]} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategory(""); setStatus(""); setDifficulty(""); setPage(1); }}><X /> Clear</Button> : null}
      </div>
      <Card className="overflow-hidden p-0">
        {list.isError && !d ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !d ? (
          <div className="grid gap-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : d.items.length === 0 ? (
          <EmptyBox title="No questions found" body={filtered ? "Try different filters or clear them." : "Add your first question or import a CSV."} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[46%] pl-4">Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">% correct</TableHead>
                <TableHead className="pr-4 text-right">Reports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={list.isFetching ? "opacity-70 transition-opacity" : ""}>
              {d.items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/questions/${item.id}`)}>
                  <TableCell className="max-w-0 pl-4">
                    <p className="truncate font-medium">{item.text}</p>
                    <p className="truncate text-xs text-muted-foreground">✓ {item.options[item.correctIndex]} · {item.options.filter((_, i) => i !== item.correctIndex).join(" · ")}</p>
                  </TableCell>
                  <TableCell><CategoryPill slug={item.category} /></TableCell>
                  <TableCell><Difficulty value={item.difficulty} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <SimpleSelect size="sm" label={`Status for ${item.text.slice(0, 30)}`} value={item.status} onChange={(v) => setStatusM.mutate({ id: item.id, status: v as QuestionStatus })} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} className="min-w-28" />
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">{item.accuracy == null ? "—" : `${Math.round(item.accuracy * 100)}%`}<span className="block text-[11px]">{item.timesShown} plays</span></TableCell>
                  <TableCell className="tabular pr-4 text-right">{item.reportCount ? <span className="font-semibold text-destructive">{item.reportCount}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {d && d.total > d.pageSize ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="tabular text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft /> Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight /></Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
