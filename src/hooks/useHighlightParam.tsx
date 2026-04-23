import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Reads a query param (e.g. ?msg=xxx) and returns the highlighted id.
 * When `dataReady` becomes true, scrolls the matching DOM element (id={`${prefix}-${value}`})
 * into view and applies a temporary "ring" highlight via the returned `isHighlighted(id)` helper.
 *
 * @param paramKey URL search param key (e.g. "msg", "charge", "focus")
 * @param prefix DOM id prefix to scroll to (e.g. "msg" → element id "msg-<value>")
 * @param dataReady true when list is loaded so the element exists
 * @param onMatch optional callback fired once when match is found (e.g. mark-as-read)
 */
export function useHighlightParam(
  paramKey: string,
  prefix: string,
  dataReady: boolean,
  onMatch?: (value: string) => void
) {
  const [params, setParams] = useSearchParams();
  const value = params.get(paramKey);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !dataReady) return;
    const el = document.getElementById(`${prefix}-${value}`);
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setHighlighted(value);
    onMatch?.(value);

    // Clear highlight after 3.5s and remove the param so refresh doesn't re-trigger
    const t = setTimeout(() => {
      setHighlighted(null);
      const next = new URLSearchParams(params);
      next.delete(paramKey);
      setParams(next, { replace: true });
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dataReady]);

  const isHighlighted = (id: string) => highlighted === id;
  return { highlightedId: highlighted, isHighlighted };
}

/** Tailwind classes to apply when a row is highlighted */
export const highlightClasses =
  "ring-2 ring-primary ring-offset-2 ring-offset-background transition-shadow duration-500";
