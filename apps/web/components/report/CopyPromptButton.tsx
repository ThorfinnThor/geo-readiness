"use client";

import { useState } from "react";

// Copies a paste-ready fix prompt to the clipboard. Hidden in print/PDF.
export function CopyPromptButton({
  text,
  label = "Copy fix prompt",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg print:hidden"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
