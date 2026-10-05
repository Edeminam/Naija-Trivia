import { Text as RNText, type TextProps } from "react-native";
import { cn } from "../lib/cn";

type Variant = "display" | "h1" | "h2" | "h3" | "title" | "body" | "bodyStrong" | "caption" | "label" | "overline" | "number";
type Tone = "default" | "muted" | "faint" | "primary" | "accent" | "danger" | "ink";

const variants: Record<Variant, string> = {
  display: "font-display text-3xl",
  h1: "font-heading text-2xl",
  h2: "font-heading text-xl",
  h3: "font-heading text-lg",
  title: "font-body-sb text-lg",
  body: "font-body text-base",
  bodyStrong: "font-body-sb text-base",
  caption: "font-body text-sm",
  label: "font-body-md text-sm",
  overline: "font-body-sb text-xs uppercase tracking-widest",
  number: "font-heading text-lg",
};

const tones: Record<Tone, string> = {
  default: "text-ink",
  muted: "text-ink-muted",
  faint: "text-ink-faint",
  primary: "text-primary-text",
  accent: "text-accent-text",
  danger: "text-danger-text",
  ink: "text-primary-ink",
};

export interface TxtProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  /** tabular numerals for scores, timers and coins */
  tabular?: boolean;
  className?: string;
}

/** Text with the type scale baked in. Supports Dynamic Type up to 1.6×. */
export function Txt({ variant = "body", tone = "default", tabular, className, style, ...rest }: TxtProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      className={cn(variants[variant], tones[tone], className)}
      style={[tabular || variant === "number" ? { fontVariant: ["tabular-nums"] } : null, style]}
      {...rest}
    />
  );
}
