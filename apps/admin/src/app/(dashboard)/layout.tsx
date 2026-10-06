"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { Nav } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { session } from "@/lib/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!session.get()) router.replace("/login");
    else setReady(true);
  }, [router]);
  if (!ready) return null;
  const signOut = () => {
    session.set(null);
    router.replace("/login");
  };
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <div className="px-2 pt-1"><Brand /></div>
        <Nav />
        <div className="mt-auto flex items-center justify-between px-1">
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Sign out</Button>
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
          <Brand compact />
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-6 px-2 pt-1"><Brand /></div>
          <Nav onNavigate={() => setOpen(false)} />
          <Button variant="ghost" size="sm" className="mt-6" onClick={signOut}><LogOut /> Sign out</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
