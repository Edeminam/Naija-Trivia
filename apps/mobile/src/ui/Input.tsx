import { forwardRef, useState, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Txt } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { cn } from "../lib/cn";
import { fonts } from "../theme/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  success?: string | null;
  prefix?: ReactNode;
  right?: ReactNode;
  className?: string;
}

/** Labelled text field with prefix/right adornments and inline status. */
export const Input = forwardRef<TextInput, InputProps>(function Input({ label, hint, error, success, prefix, right, className, onFocus, onBlur, style, ...rest }, ref) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const status = error ?? success ?? hint;
  return (
    <View className={cn("gap-2", className)}>
      {label ? (
        <Txt variant="label" tone="muted" nativeID={`${label}-label`}>
          {label}
        </Txt>
      ) : null}
      <View className={cn("flex-row items-center rounded-btn border-2 bg-surface px-4 min-h-[56px]", error ? "border-danger" : focused ? "border-primary" : "border-line")}>
        {prefix}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={label ? `${label}-label` : undefined}
          placeholderTextColor={c.faint}
          selectionColor={c.primary}
          maxFontSizeMultiplier={1.5}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[{ flex: 1, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 17, paddingVertical: 14, outlineStyle: "none" } as any, style]}
          {...rest}
        />
        {right}
      </View>
      {status ? (
        <Txt variant="caption" tone={error ? "danger" : success ? "primary" : "faint"} accessibilityLiveRegion="polite">
          {status}
        </Txt>
      ) : null}
    </View>
  );
});
