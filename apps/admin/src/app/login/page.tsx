"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2, ShieldCheck, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "@/components/brand";
import { api, session, SERVER_URL } from "@/lib/api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (token: string, userId: string) => {
    session.set({ token, userId });
    try {
      await api("/admin/me");
      router.replace("/");
    } catch (e: any) {
      session.set(null);
      toast.error(e.status === 403 ? "This account isn't an admin" : e.message);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error || !data.session) return void toast.error(error?.message ?? "Sign-in failed");
    await finish(data.session.access_token, data.session.user.id);
  };

  const devSignIn = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/dev`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", admin: true }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Dev sign-in unavailable");
      await finish(json.token, json.userId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--green-soft),transparent_60%)]" />
      <Card className="relative w-full max-w-sm">
        <CardHeader className="gap-4">
          <Brand />
          <div>
            <CardTitle className="text-xl">Sign in to the CMS</CardTitle>
            <CardDescription>Questions, review queue, reports and fair-play flags.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {supabase ? (
            <form onSubmit={signIn} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={busy} className="mt-1">
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Sign in
              </Button>
            </form>
          ) : (
            <div className="grid gap-3">
              <div className="flex gap-3 rounded-xl border bg-muted/50 p-3 text-sm">
                <Terminal className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="text-muted-foreground">Supabase keys aren&apos;t set, so the admin uses the server&apos;s local dev sign-in.</p>
              </div>
              <Button onClick={devSignIn} disabled={busy} data-testid="dev-admin-sign-in">
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Sign in as local admin
              </Button>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">Admin access requires <code className="rounded bg-muted px-1">profiles.is_admin = true</code>.</p>
        </CardContent>
      </Card>
    </main>
  );
}
