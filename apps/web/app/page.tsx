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

      {/* Domain form is implemented in E12 (Free Preview). E00 is scaffold only. */}
      <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        Scan form arrives in E12 — this is the E00 scaffold.
      </div>

      <p className="text-xs text-neutral-500">{READINESS_DISCLAIMER}</p>
    </main>
  );
}
