"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { questionInputSchema, categorySlugSchema } from "@ntc/shared";
import { api } from "@/lib/api";
import { PageHeader, CategoryPill, EmptyBox, SimpleSelect } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const COLUMNS = ["category", "text", "option_a", "option_b", "option_c", "option_d", "correct", "difficulty", "fact", "source_url"];
const TEMPLATE = `${COLUMNS.join(",")}
geography,What is the capital of Kwara State?,Ilorin,Offa,Lokoja,Omu-Aran,A,2,Kwara is the 'State of Harmony'.,https://en.wikipedia.org/wiki/Kwara_State
food,"Gbegiri is a soup made from…",Beans,Melon,Okra,Pumpkin,A,2,It's often served with amala and ewedu.,https://en.wikipedia.org/wiki/Gbegiri_soup`;

function toInput(r: Record<string, string>) {
  const correctRaw = (r.correct ?? "").trim().toUpperCase();
  const correctIndex = /^[ABCD]$/.test(correctRaw) ? "ABCD".indexOf(correctRaw) : Number(correctRaw) - 1;
  const cat = (r.category ?? "").trim().toLowerCase();
  return {
    category: categorySlugSchema.safeParse(cat).success ? cat : cat || "(missing)",
    text: (r.text ?? "").trim(),
    options: [r.option_a, r.option_b, r.option_c, r.option_d].map((o) => (o ?? "").trim()),
    correctIndex,
    difficulty: Number(r.difficulty),
    fact: (r.fact ?? "").trim(),
    sourceUrl: (r.source_url ?? "").trim(),
  };
}

export default function Import() {
  const qc = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<"in_review" | "draft">("in_review");
  const rows = useMemo(() => {
    if (!csv.trim()) return [];
    const p = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_") });
    return p.data.map((raw, i) => {
      const input = toInput(raw);
      const r = questionInputSchema.safeParse({ ...input, status });
      const issue = r.success ? null : r.error.issues[0];
      return { n: i + 1, input, ok: r.success, error: issue ? `${issue.path.join(".") || "row"}: ${issue.message}` : null };
    });
  }, [csv, status]);
  const valid = rows.filter((r) => r.ok);

  const run = useMutation({
    mutationFn: () => api<{ imported: number; failed: number; results: { row: number; ok: boolean; error?: string }[] }>("/admin/import", { body: { rows: valid.map((r) => r.input), status } }),
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported} question${r.imported === 1 ? "" : "s"}${r.failed ? ` · ${r.failed} skipped` : ""}`);
      void qc.invalidateQueries({ queryKey: ["questions"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      if (!r.failed) setCsv("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="CSV import"
        description="Paste or upload a CSV. Every row is validated before anything is saved."
        actions={
          <Button variant="outline" onClick={() => { const b = new Blob([TEMPLATE], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "naija-trivia-questions-template.csv"; a.click(); }}>
            <FileDown /> Template
          </Button>
        }
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>Columns: <code className="text-xs">{COLUMNS.join(", ")}</code>. <code className="text-xs">correct</code> is A–D (or 1–4).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea rows={7} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={TEMPLATE} className="font-mono text-xs" aria-label="CSV content" />
            <div className="flex flex-wrap items-center gap-2">
              <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); e.target.value = ""; }} />
              <Button variant="outline" onClick={() => file.current?.click()}><Upload /> Upload .csv</Button>
              <span className="text-sm text-muted-foreground">Import as</span>
              <SimpleSelect label="Import status" value={status} onChange={setStatus} options={[{ value: "in_review", label: "In review" }, { value: "draft", label: "Draft" }]} />
              <Button className="ml-auto" disabled={!valid.length || run.isPending} onClick={() => run.mutate()} data-testid="run-import">
                {run.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Import {valid.length} valid row{valid.length === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <EmptyBox icon={FileSpreadsheet} title="Preview appears here" body="Paste CSV above or download the template to get started." />
          ) : (
            <>
              <div className="flex gap-4 border-b px-4 py-3 text-sm">
                <span className="tabular text-green-text">{valid.length} valid</span>
                <span className={cn("tabular", rows.length - valid.length ? "text-destructive" : "text-muted-foreground")}>{rows.length - valid.length} with errors</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-4">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead className="pr-4">Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.n} className={r.ok ? "" : "bg-destructive/5"}>
                      <TableCell className="tabular pl-4 text-muted-foreground">{r.n}</TableCell>
                      <TableCell className="max-w-80 truncate">{r.input.text || <span className="text-muted-foreground">(empty)</span>}</TableCell>
                      <TableCell><CategoryPill slug={r.input.category} /></TableCell>
                      <TableCell className="max-w-40 truncate">{r.input.options[r.input.correctIndex] ?? "—"}</TableCell>
                      <TableCell className="pr-4">
                        {r.ok ? <span className="inline-flex items-center gap-1 text-sm text-green-text"><CheckCircle2 className="size-4" /> Ready</span> : <span className="inline-flex items-center gap-1 text-sm text-destructive"><XCircle className="size-4 shrink-0" /> {r.error}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>
        {run.data?.results.some((r) => !r.ok) ? (
          <Card>
            <CardHeader><CardTitle>Server results</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid gap-1 text-sm">{run.data.results.filter((r) => !r.ok).map((r) => <li key={r.row} className="text-destructive">Row {r.row}: {r.error}</li>)}</ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
