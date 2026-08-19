import Link from "next/link";

import { READINESS_DISCLAIMER } from "@/lib/readiness";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          How ready is your website for AI Search?
        </h1>
        <p className="text-lg text-neutral-500">
          A deterministic, evidence-based audit of how well your site can be
          understood and used as a source by AI search and answer systems.
        </p>
      </header>

      {/* The live domain form (submitting a real scan) lands with the API
          wiring; the preview/report UIs already render the report contract. */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-dashed border-neutral-300 p-6 text-sm dark:border-neutral-700">
        <Link href="/scan/demo" className="font-medium underline">
          See an example readiness preview →
        </Link>
      </div>

      <p className="text-xs text-neutral-500">{READINESS_DISCLAIMER}</p>
    </main>
  );
}
