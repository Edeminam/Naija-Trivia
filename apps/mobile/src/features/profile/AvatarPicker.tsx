import { View } from "react-native";
import { AVATARS } from "@ntc/shared";
import { Avatar, PressableScale, Txt } from "../../ui";
import { cn } from "../../lib/cn";
import { haptic } from "../../lib/haptics";

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-4">
      {AVATARS.map((a) => {
        const selected = a.id === value;
        return (
          <PressableScale
            key={a.id}
            onPress={() => {
              haptic.select();
              onChange(a.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${a.name} avatar`}
            className={cn("w-[23%] items-center gap-1.5 rounded-2xl border-2 py-3", selected ? "border-primary bg-primary-soft" : "border-transparent")}
          >
            <Avatar id={a.id} size={60} />
            <Txt variant="caption" tone={selected ? "primary" : "muted"}>{a.name}</Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}
