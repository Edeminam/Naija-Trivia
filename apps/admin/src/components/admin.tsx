"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Check, Inbox, Lightbulb, RotateCw } from "lucide-react";
import { categoryBySlug, type QuestionStatus } from "@ntc/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const STATUS_STYLE: Record<QuestionStatus, string> = {
  live: "bg-green-soft text-green-text",
  in_review: "bg-gold-soft text-gold",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-destructive/12 text-destructive",
  retired: "bg-muted text-muted-foreground line-through",
};
export const STATUS_LABEL: Record<QuestionStatus, string> = { live: "Live", in_review: "In review", draft: "Draft", paused: "Paused", retired: "Retired" };
export const STATUSES = Object.keys(STATUS_LABEL) as QuestionStatus[];

export function StatusBadge({ status, releaseAt, scheduled }: { status: QuestionStatus; releaseAt?: string | null; scheduled?: boolean }) {
  if (status === "live" && releaseAt && scheduled) {
    const day = new Date(releaseAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return <span className="inline-flex h-6 items-center rounded-full bg-primary/12 px-2.5 text-xs font-medium text-green-text">Scheduled · {day}</span>;
  }
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function CategoryPill({ slug }: { slug: string }) {
  const c = categoryBySlug(slug);
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium">
      <span className="size-2 rounded-full" style={{ backgroundColor: c?.tint }} />
      {c?.short ?? slug}
    </span>
  );
}

export function Difficulty({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Difficulty ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-3 w-1.5 rounded-full", i <= value ? "bg-primary" : "bg-muted")} />
      ))}
    </span>
  );
}

export function SimpleSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  className,
  size,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  label: string;
  className?: string;
  size?: "sm" | "default";
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select items={items} value={value || null} onValueChange={(v) => v != null && onChange(v as T)}>
      <SelectTrigger aria-label={label} className={cn("min-w-36", className)} size={size}>
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmptyBox({ title, body, icon: Icon = Inbox }: { title: string; body?: string; icon?: typeof Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-green-soft text-green-text"><Icon className="size-5" /></div>
      <p className="font-heading text-base font-bold">{title}</p>
      {body ? <p className="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" role="alert">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/12 text-destructive"><AlertTriangle className="size-5" /></div>
      <p className="font-heading text-base font-bold">Couldn&apos;t load this</p>
      <p className="max-w-sm text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry} className="mt-2"><RotateCw /> Try again</Button> : null}
    </div>
  );
}

/** Live preview styled like the mobile question card + answer buttons. */
export function QuestionPreview({ text, options, correctIndex, category, fact, reveal }: { text: string; options: string[]; correctIndex: number; category: string; fact: string; reveal?: boolean }) {
  const c = categoryBySlug(category);
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[28px] border bg-[#0B0F0D] p-4 text-[#F4F6F5] shadow-xl">
      <div className="rounded-[20px] border border-white/8 bg-[#141A17] p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-[#1C2420] px-3 text-xs font-medium text-[#A3ADA8]">
            <span className="size-2 rounded-full" style={{ backgroundColor: c?.tint }} />
            {c?.name ?? "Category"}
          </span>
          <span className="flex size-11 items-center justify-center rounded-full border-4 border-[#0FA958] font-heading text-base font-bold">10</span>
        </div>
        <p className="mt-4 font-heading text-[19px] font-bold leading-snug">{text || "Your question appears here…"}</p>
      </div>
      {reveal && fact ? (
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-[#E8B44A]/14 p-3 text-xs">
          <Lightbulb className="size-4 shrink-0 text-[#E8B44A]" />
          <p><span className="text-[#F0C76E]">Did you know? </span>{fact}</p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2">
        {[0, 1, 2, 3].map((i) => {
          const correct = reveal && i === correctIndex;
          return (
            <div key={i} className={cn("flex min-h-12 items-center gap-3 rounded-[14px] border-2 px-3 py-2 text-sm font-semibold", correct ? "border-[#0FA958] bg-[#0FA958]/14" : "border-white/8 bg-[#141A17]")}>
              <span className={cn("flex size-8 items-center justify-center rounded-[10px] text-xs", correct ? "bg-[#0FA958] text-[#03140B]" : "bg-[#1C2420] text-[#A3ADA8]")}>
                {correct ? <Check className="size-4" /> : "ABCD"[i]}
              </span>
              <span className="flex-1">{options[i] || <span className="text-white/30">Option {"ABCD"[i]}</span>}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "green" | "gold" | "red" }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("tabular mt-2 font-heading text-3xl font-bold", tone === "green" && "text-green-text", tone === "gold" && "text-gold", tone === "red" && "text-destructive")}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
