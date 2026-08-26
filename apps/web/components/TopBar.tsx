import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";

// Slim top bar for the report/scan pages (which have no marketing nav).
export function TopBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
          />
          <span className="font-mono text-sm font-medium tracking-tight">findyouraiscore</span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/methodology"
            className="hidden text-sm text-fg-muted transition-colors hover:text-fg sm:block"
          >
            How scoring works
          </Link>
          <Link href="/learn" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Learn
          </Link>
          <Link href="/pricing" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Pricing
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </div>
  );
}
