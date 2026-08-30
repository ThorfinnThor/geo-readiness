import Link from "next/link";

import { TopBar } from "@/components/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-mono text-sm text-fg-subtle">404</span>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-fg-muted">
          The page you are looking for does not exist or has moved. Try a fresh scan or browse the
          guides.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            Run a free scan
          </Link>
          <Link
            href="/learn"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2"
          >
            Browse the guides
          </Link>
        </div>
      </main>
    </>
  );
}
