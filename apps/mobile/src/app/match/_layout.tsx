import { Stack } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";

export default function MatchLayout() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "fade", gestureEnabled: false }} />;
}
