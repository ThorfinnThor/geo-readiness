# FindYourAIScore — conversion v2 review

This folder is a **design/prototype only**. It is intentionally not wired into `apps/web/app` and should not be treated as production copy until the decisions below are approved.

## Scope

This prototype covers the requested conversion changes:

1. **Homepage / offer framing** — lead with the buyer problem and paid deliverable, keep deterministic/no-provider-call positioning as trust support.
2. **Free results → purchase moment** — surface issue count, severity and weakest categories; reveal one complete fix; keep all other premium text server-side; sell “all fixes + evidence + implementation prompts.”
3. **Pricing** — use a concrete founding offer rather than an unexplained 10× anchor. Prototype: €4.99 for the first 100 paid audits, one-time/no subscription.
4. **Sample report** — make it strong sales collateral with realistic crawl depth, high confidence and 3 complete findings. Keep fictional/illustrative labels until a consenting real customer can replace the example.
5. **Competitor comparison** — compare two sites with the same deterministic engine. This does not require LLM API calls. Free comparison creates purchase intent; Premium monetizes the gap-closing action plan.

## Recommended buyer funnel

`Homepage → free scan → personalized pain → one real fix → paid backlog → optional competitor comparison → rescan/comparison over time`

The principal change is that methodology no longer has to do the selling. The product demonstrates a specific problem first, then offers a specific solution.

## Important product/security constraints

- Do **not** send locked premium titles, problems, recommendations, evidence or fix prompts to an unpaid browser merely to blur them visually.
- The current `PreviewDoc` pattern is directionally correct: send severity/category metadata plus the intentionally revealed sample action.
- Any “potential score lift” should only be shown if the engine can calculate it deterministically. The prototype intentionally does not claim one.
- The competitor comparison should use the same scoring version and ideally record both scan timestamps/methodology hashes.
- Do not claim a real customer before consent. The prototype keeps BrightSolar fictional and marks its before/after state illustrative.

## Pricing decision

The prototype removes “€49 after launch” from the primary sales UI. Recommended sequence:

- Founding validation: €4.99 with a real cap (for example first 100 paid audits).
- Once strangers are buying reliably, test €9 / €19 / €29.
- Re-introduce €49 only if conversion/value evidence supports it.

If you want to keep €49 now, the visual design still works; only the price microcopy needs to change.

## Competitor comparison MVP

A minimal implementation can avoid building a new scoring system:

1. User completes scan A.
2. User enters competitor domain.
3. Run ordinary deterministic scan B.
4. Store/accept both scan IDs on a comparison view.
5. Compare overall and component scores using the same methodology version.
6. For unpaid users, show score gaps and category-level deltas.
7. For paid users, link the user's existing findings to the biggest gap categories (“close this gap”).

This produces a much stronger commercial question — “why are they ahead of me?” — without any LLM-provider spend.

## Review

Open `prototype.html` directly in a browser. Use the top tabs on desktop or the screen selector on narrow/mobile viewports to switch among the five proposals.

See [`QA.md`](./QA.md) for the static and browser checks performed on this branch.

No live Next.js route, checkout behavior, database schema or production pricing has been changed in this review artifact.
