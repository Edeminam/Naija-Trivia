import { useId } from "react";

/** Unique, url()-safe id per SVG instance (shared ids break gradients on web when a copy is hidden). */
export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
