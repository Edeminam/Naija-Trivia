import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Megaphone, X } from "lucide-react-native";
import { useAdOverlay } from "./AdService";
import { Txt, Icon, Button, AdirePattern, ProgressBar, IconButton } from "../../ui";
import { useTheme } from "../../theme/ThemeProvider";

const AD_MS = 3_000;

/** Mock ad unit: 3s countdown, then dismissible. Rewarded ads only pay out if watched to the end. */
export function AdOverlayHost() {
  const open = useAdOverlay((s) => s.open);
  const { c } = useTheme();
  const [left, setLeft] = useState(AD_MS);
  useEffect(() => {
    if (!open) return;
    setLeft(AD_MS);
    const start = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, AD_MS - (Date.now() - start))), 100);
    return () => clearInterval(id);
  }, [open]);
  if (!open) return null;
  const done = left === 0;
  const close = (completed: boolean) => {
    open.resolve(completed);
    useAdOverlay.setState({ open: null });
  };
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg, zIndex: 100 }} accessibilityViewIsModal>
      <AdirePattern opacity={0.05} id="ad-pattern" />
      <View className="flex-1 items-center justify-center px-8 gap-5">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft">
          <Icon as={Megaphone} size={36} tone="accent" />
        </View>
        <Txt variant="overline" tone="faint">
          Sponsored · demo ad
        </Txt>
        <Txt variant="h1" className="text-center">
          Your ad could be here
        </Txt>
        <Txt variant="body" tone="muted" className="text-center">
          This is a placeholder ad unit. Go Premium to remove ads entirely.
        </Txt>
        <View className="w-full max-w-[280px] mt-2">
          <ProgressBar value={1 - left / AD_MS} tone="accent" label="Ad progress" />
        </View>
        {done ? (
          <Button label={open.kind === "rewarded" ? "Collect reward" : "Continue"} onPress={() => close(true)} variant={open.kind === "rewarded" ? "accent" : "primary"} />
        ) : (
          <Txt variant="label" tone="faint" tabular>
            {Math.ceil(left / 1000)}s
          </Txt>
        )}
      </View>
      {open.kind === "interstitial" && done ? (
        <View style={{ position: "absolute", top: 56, right: 20 }}>
          <IconButton icon={X} label="Close ad" onPress={() => close(true)} />
        </View>
      ) : null}
    </Animated.View>
  );
}
