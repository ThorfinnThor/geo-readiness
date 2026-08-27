"use client";

// Share the public scan result. Uses the native share sheet on mobile and falls
// back to copying the link. This is the viral loop: the shared link unfurls into
// the dynamic score card (see app/scan/[id]/opengraph-image.tsx).
import { useState } from "react";

export function ShareButton({ score, domain }: { score: number; domain: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${domain} scored ${Math.round(score)}/100 for AI search readiness`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Find Your AI Score", text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing we can do silently
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "Link copied" : "Share your score"}
    </button>
  );
}
