import { View } from "react-native";
import { WifiOff, AlertTriangle, type LucideIcon } from "lucide-react-native";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { cn } from "../lib/cn";

export function EmptyState({ icon, title, body, actionLabel, onAction, className }: { icon: LucideIcon; title: string; body?: string; actionLabel?: string; onAction?: () => void; className?: string }) {
  return (
    <View className={cn("items-center px-6 py-10 gap-3", className)}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon as={icon} size={28} tone="primary" />
      </View>
      <Txt variant="h3" className="text-center">
        {title}
      </Txt>
      {body ? (
        <Txt variant="body" tone="muted" className="text-center max-w-[300px]">
          {body}
        </Txt>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" className="mt-2" /> : null}
    </View>
  );
}

/** Friendly error with retry. `offline` swaps in the no-connection copy. */
export function ErrorState({ title, body, onRetry, offline, className }: { title?: string; body?: string; onRetry?: () => void; offline?: boolean; className?: string }) {
  return (
    <View className={cn("items-center px-6 py-10 gap-3", className)} accessibilityLiveRegion="polite">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
        <Icon as={offline ? WifiOff : AlertTriangle} size={28} tone="danger" />
      </View>
      <Txt variant="h3" className="text-center">
        {title ?? (offline ? "You're offline" : "Wahala dey o")}
      </Txt>
      <Txt variant="body" tone="muted" className="text-center max-w-[300px]">
        {body ?? (offline ? "Check your connection and we'll pick up where you left off." : "Something didn't load. Give it another go.")}
      </Txt>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" className="mt-2" /> : null}
    </View>
  );
}
