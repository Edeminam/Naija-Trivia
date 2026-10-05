/** Design tokens → Tailwind. Colours are CSS variables so dark/light swap at runtime (see src/theme). */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        raised: c("raised"),
        line: "var(--line)",
        primary: { DEFAULT: c("primary"), pressed: c("primary-pressed"), ink: c("primary-ink"), text: c("primary-text"), soft: "var(--primary-soft)" },
        accent: { DEFAULT: c("accent"), soft: "var(--accent-soft)", text: c("accent-text") },
        danger: { DEFAULT: c("danger"), soft: "var(--danger-soft)", text: c("danger-text") },
        ink: { DEFAULT: c("text"), muted: c("muted"), faint: c("faint") },
      },
      fontFamily: {
        display: ["Satoshi-Black"],
        heading: ["Satoshi-Bold"],
        "heading-md": ["Satoshi-Medium"],
        body: ["Inter_400Regular"],
        "body-md": ["Inter_500Medium"],
        "body-sb": ["Inter_600SemiBold"],
        "body-b": ["Inter_700Bold"],
      },
      fontSize: {
        "3xl": ["34px", { lineHeight: "40px", letterSpacing: "-0.6px" }],
        "2xl": ["28px", { lineHeight: "34px", letterSpacing: "-0.4px" }],
        xl: ["22px", { lineHeight: "28px", letterSpacing: "-0.2px" }],
        lg: ["17px", { lineHeight: "24px" }],
        base: ["15px", { lineHeight: "22px" }],
        sm: ["13px", { lineHeight: "18px" }],
        xs: ["11px", { lineHeight: "14px", letterSpacing: "0.4px" }],
      },
      spacing: { 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 12: "48px" },
      borderRadius: { card: "20px", btn: "14px", chip: "999px" },
      minHeight: { touch: "48px" },
      minWidth: { touch: "48px" },
    },
  },
  plugins: [],
};
