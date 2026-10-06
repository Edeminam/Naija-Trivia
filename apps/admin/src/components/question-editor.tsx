"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Save, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, questionInputSchema, type QuestionStatus } from "@ntc/shared";
import { api } from "@/lib/api";
import type { AdminQuestion } from "@/lib/types";
import { QuestionPreview, SimpleSelect, STATUSES, STATUS_LABEL } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Draft {
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  fact: string;
  sourceUrl: string;
  status: QuestionStatus;
}

const blank: Draft = { category: "nollywood", text: "", options: ["", "", "", ""], correctIndex: 0, difficulty: 2, fact: "", sourceUrl: "", status: "draft" };

function Field({ label, error, children, hint, htmlFor }: { label: string; error?: string; children: React.ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function QuestionEditor({ initial }: { initial?: AdminQuestion }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(
    initial
      ? { category: initial.category, text: initial.text, options: [...initial.options], correctIndex: initial.correctIndex, difficulty: initial.difficulty, fact: initial.fact, sourceUrl: initial.sourceUrl ?? "", status: initial.status }
      : blank,
  );
  const [touched, setTouched] = useState(false);
  const [reveal, setReveal] = useState(true);
  const parsed = useMemo(() => questionInputSchema.safeParse(d), [d]);
  const errors = useMemo(() => {
    const m: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) m[i.path.join(".")] ??= i.message;
    return m;
  }, [parsed]);
  const err = (k: string) => (touched ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => (initial ? api(`/admin/questions/${initial.id}`, { method: "PUT", body: d }) : api<{ id: string }>("/admin/questions", { body: d })),
    onSuccess: (r: any) => {
      toast.success(initial ? "Question updated" : "Question created");
      void qc.invalidateQueries({ queryKey: ["questions"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      if (!initial) router.replace(`/questions/${r.id}`);
      else void qc.invalidateQueries({ queryKey: ["question", initial.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_400px]"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (parsed.success) save.mutate();
        else toast.error("Fix the highlighted fields first");
      }}
    >
      <Card>
        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category"><SimpleSelect label="Category" value={d.category} onChange={(v) => set("category", v)} options={CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))} className="w-full" /></Field>
            <Field label="Difficulty"><SimpleSelect label="Difficulty" value={String(d.difficulty)} onChange={(v) => set("difficulty", Number(v))} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} · ${["Easy", "Fair", "Medium", "Hard", "Expert"][n - 1]}` }))} className="w-full" /></Field>
            <Field label="Status"><SimpleSelect label="Status" value={d.status} onChange={(v) => set("status", v as QuestionStatus)} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} className="w-full" /></Field>
          </div>
          <Field label="Question" htmlFor="q-text" error={err("text")} hint={`${d.text.length}/220 · keep it to one clear sentence`}>
            <Textarea id="q-text" rows={3} value={d.text} onChange={(e) => set("text", e.target.value)} aria-invalid={!!err("text")} placeholder="e.g. Which Nigerian state is called the 'Coal City State'?" />
          </Field>
          <div className="grid gap-2">
            <Label>Options <span className="font-normal text-muted-foreground">— tick the correct one</span></Label>
            {d.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set("correctIndex", i)}
                  aria-label={`Mark option ${"ABCD"[i]} correct`}
                  aria-pressed={d.correctIndex === i}
                  className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors", d.correctIndex === i ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {d.correctIndex === i ? <Check className="size-4" /> : "ABCD"[i]}
                </button>
                <Input value={o} onChange={(e) => set("options", d.options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${"ABCD"[i]}`} aria-label={`Option ${"ABCD"[i]}`} aria-invalid={!!err(`options.${i}`)} />
              </div>
            ))}
            {err("options") || [0, 1, 2, 3].map((i) => err(`options.${i}`)).find(Boolean) ? <p className="text-xs text-destructive">{err("options") ?? [0, 1, 2, 3].map((i) => err(`options.${i}`)).find(Boolean)}</p> : <p className="text-xs text-muted-foreground">Options are shuffled for every player, so order doesn&apos;t matter.</p>}
          </div>
          <Field label="Did you know? fact" htmlFor="q-fact" error={err("fact")} hint="One line shown on the reveal screen.">
            <Textarea id="q-fact" rows={2} value={d.fact} onChange={(e) => set("fact", e.target.value)} aria-invalid={!!err("fact")} />
          </Field>
          <Field label="Source URL" htmlFor="q-src" error={err("sourceUrl")} hint="Where a reviewer can verify the answer.">
            <div className="flex gap-2">
              <Input id="q-src" value={d.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" aria-invalid={!!err("sourceUrl")} />
              {d.sourceUrl.startsWith("http") ? <Button variant="outline" size="icon" nativeButton={false} render={<a href={d.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source" />}><ExternalLink /></Button> : null}
            </div>
          </Field>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={save.isPending} size="lg">{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {initial ? "Save changes" : "Create question"}</Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid content-start gap-3 lg:sticky lg:top-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Live preview</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setReveal((r) => !r)}>{reveal ? <EyeOff /> : <Eye />} {reveal ? "Hide answer" : "Show reveal"}</Button>
        </div>
        <QuestionPreview text={d.text} options={d.options} correctIndex={d.correctIndex} category={d.category} fact={d.fact} reveal={reveal} />
      </div>
    </form>
  );
}
