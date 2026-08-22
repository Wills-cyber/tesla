"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  /** The exact string copied to the clipboard. */
  value: string;
  label: string;
  /** Shortened form for display, if the full value is unwieldy. */
  display?: string;
  className?: string;
};

/**
 * A read-only value with a copy button.
 *
 * Used for deposit addresses and memos, where a mistyped character loses the
 * funds — so the address is never an editable input, and copying is the primary
 * affordance rather than an afterthought.
 *
 * `navigator.clipboard` is unavailable on insecure origins and can be denied by
 * permission policy, so the failure path selects the text instead of silently
 * doing nothing.
 */
export function CopyField({
  value,
  label,
  display,
  className,
}: CopyFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const valueRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    setFailed(false);

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Fall back to selecting the text so it can be copied manually.
      setFailed(true);
      const node = valueRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>

      <div className="flex items-stretch gap-2">
        <span
          ref={valueRef}
          data-numeric
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface-3 px-3.5 py-3 text-xs leading-relaxed break-all select-all"
        >
          {display ?? value}
        </span>

        <Button
          type="button"
          variant="hairline"
          size="icon-xl"
          onClick={copy}
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          className="shrink-0 self-stretch"
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </div>

      <span aria-live="polite" className="text-[0.7rem] text-muted-foreground">
        {copied
          ? "Copied to clipboard."
          : failed
            ? "Clipboard access was blocked — the value is selected, press Ctrl/⌘+C."
            : ""}
      </span>
    </div>
  );
}
