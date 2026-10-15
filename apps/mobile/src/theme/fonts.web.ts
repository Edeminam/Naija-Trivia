/**
 * Web: Inter as WOFF2 subsets (Latin, Yoruba/Igbo/Hausa letters and tone marks, punctuation, ₦) —
 * about 65 KB per weight instead of ~165 KB for the full TTF. Regenerate with pyftsubset; see docs/DECISIONS.md.
 * Satoshi stays as shipped: its licence doesn't allow modified copies.
 */
export const FONT_SOURCES = {
  "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.ttf"),
  "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.ttf"),
  "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.ttf"),
  Inter_400Regular: require("../../assets/fonts/web/Inter_400Regular.woff2"),
  Inter_500Medium: require("../../assets/fonts/web/Inter_500Medium.woff2"),
  Inter_600SemiBold: require("../../assets/fonts/web/Inter_600SemiBold.woff2"),
  Inter_700Bold: require("../../assets/fonts/web/Inter_700Bold.woff2"),
};
