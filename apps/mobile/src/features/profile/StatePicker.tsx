import { useMemo, useState } from "react";
import { View, FlatList } from "react-native";
import { Search, Check, Globe2, MapPin } from "lucide-react-native";
import { STATES } from "@ntc/shared";
import { Input, Txt, Icon, PressableScale } from "../../ui";
import { cn } from "../../lib/cn";
import { haptic } from "../../lib/haptics";
import { useTheme } from "../../theme/ThemeProvider";

/** Searchable list of the 36 states, FCT and Diaspora. */
export function StatePicker({ value, onChange, height = 360 }: { value: string | null; onChange: (code: string) => void; height?: number }) {
  const [q, setQ] = useState("");
  const { c } = useTheme();
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = [...STATES].sort((a, b) => (a.code === "DI" ? 1 : b.code === "DI" ? -1 : a.name.localeCompare(b.name)));
    return s ? list.filter((x) => x.name.toLowerCase().includes(s) || x.region.toLowerCase().includes(s) || x.code.toLowerCase() === s) : list;
  }, [q]);
  return (
    <View className="gap-3">
      <Input placeholder="Search states, e.g. Enugu" value={q} onChangeText={setQ} autoCorrect={false} prefix={<View className="mr-2"><Icon as={Search} size={18} tone="faint" /></View>} accessibilityLabel="Search states" />
      <View className="rounded-card border border-line bg-surface overflow-hidden" style={{ height }}>
        <FlatList
          data={items}
          keyExtractor={(s) => s.code}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View className="h-px bg-line ml-14" />}
          ListEmptyComponent={<Txt variant="body" tone="muted" className="p-6 text-center">No state matches “{q}”</Txt>}
          renderItem={({ item }) => {
            const selected = item.code === value;
            return (
              <PressableScale
                scaleTo={0.99}
                onPress={() => {
                  haptic.select();
                  onChange(item.code);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.name}, ${item.region}`}
                className={cn("flex-row items-center gap-3 px-4 min-h-[56px]", selected && "bg-primary-soft")}
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-raised">
                  <Icon as={item.code === "DI" ? Globe2 : MapPin} size={16} tone={selected ? "primary" : "muted"} />
                </View>
                <View className="flex-1">
                  <Txt variant="bodyStrong">{item.name}</Txt>
                  <Txt variant="caption" tone="faint">{item.code === "DI" ? "Nigerians abroad" : item.region}</Txt>
                </View>
                {selected ? <Icon as={Check} tone="primary" color={c.primaryText} /> : null}
              </PressableScale>
            );
          }}
        />
      </View>
    </View>
  );
}
