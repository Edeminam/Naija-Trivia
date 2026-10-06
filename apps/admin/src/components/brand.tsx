import { Swords } from "lucide-react";

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
        <Swords className="size-4.5" strokeWidth={2.2} />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <div className="font-heading text-[15px] font-bold">Naija Trivia Clash</div>
          <div className="text-xs text-muted-foreground">Admin</div>
        </div>
      ) : null}
    </div>
  );
}
