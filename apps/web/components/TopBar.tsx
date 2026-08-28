import Link from "next/link";

import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

// Slim top bar for the report/scan pages (which have no marketing nav).
export function TopBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
          />
          <span className="font-mono text-sm font-medium tracking-tight">findyouraiscore</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <div className="hidden items-center gap-5 sm:flex">
            <Link
              href="/methodology"
              className="flex min-h-[44px] items-center text-sm text-fg-muted transition-colors hover:text-fg"
            >
              How scoring works
            </Link>
            <Link
              href="/product"
              className="flex min-h-[44px] items-center text-sm text-fg-muted transition-colors hover:text-fg"
            >
              Product
            </Link>
            <Link
              href="/learn"
              className="flex min-h-[44px] items-center text-sm text-fg-muted transition-colors hover:text-fg"
            >
              Learn
            </Link>
            <Link
              href="/pricing"
              className="flex min-h-[44px] items-center text-sm text-fg-muted transition-colors hover:text-fg"
            >
              Pricing
            </Link>
          </div>
          <MobileMenu
            links={[
              { href: "/product", label: "Product" },
              { href: "/methodology", label: "How scoring works" },
              { href: "/learn", label: "Learn" },
              { href: "/pricing", label: "Pricing" },
            ]}
          />
          <ThemeToggle />
        </nav>
      </div>
    </div>
  );
}
