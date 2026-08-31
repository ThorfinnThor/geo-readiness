# Conversion v2 prototype — QA record

Validated against branch `review/conversion-v2-no-deploy` on 2026-09-01 (Europe/Berlin).

## Scope

The branch changes only these review artifacts/configuration files:

- `docs/reviews/conversion-v2/prototype.html`
- `docs/reviews/conversion-v2/prototype.payload/*.js` (the compressed, self-contained prototype snapshot loaded by `prototype.html`)
- `docs/reviews/conversion-v2/README.md`
- `docs/reviews/conversion-v2/QA.md`
- `apps/web/vercel.json` (branch-specific deployment suppression)

It does not implement the proposal in the production Next.js routes, scanner, database, checkout, report contracts or payment entitlement code.

## Checks completed

- HTML parsed with no structural parser diagnostics.
- CSS parsed with no syntax errors.
- Inline JavaScript passed `node --check`.
- The compressed prototype payload reconstructed byte-for-byte to the reviewed source.
- The lightweight loader successfully reconstructed and rendered that source in Chromium.
- JSON in `apps/web/vercel.json` parsed successfully and uses Vercel's supported per-branch `git.deploymentEnabled` mapping.
- Every proposed screen has exactly one page-level `h1`.
- All IDs are unique; every desktop tab, mobile option and internal jump points to an existing screen.
- Prototype buttons explicitly use `type="button"`.
- Desktop tabs and the mobile screen selector both synchronize the active screen and accessibility state.
- Chromium browser checks covered all five screens at widths 1440, 1024, 821, 820, 768, 390, 320 and 280 pixels.
- No console errors or unhandled page errors occurred.
- No tested screen produced horizontal page overflow.
- Desktop tab switching, the homepage-to-sample jump and mobile selector switching all passed.
- Narrow-layout fixes were visually reviewed for the homepage, results, pricing, sample report and competitor comparison.

## Bugs found and corrected during QA

1. The screen navigation disappeared below 821 px, making the other prototype screens inaccessible on mobile. A mobile selector now replaces the desktop tabs.
2. The sample-report domain and shared header caused horizontal overflow on narrow screens. Grid min-width and responsive heading rules now prevent it.
3. The competitor call-to-action remained a two-column layout at 320 px and became unreadably narrow. It now stacks on mobile.
4. The results screen had no page-level heading. It now includes an accessible `h1` without altering the visual design.
5. Navigation state was visual only. Desktop tabs now update `aria-pressed`, and focus-visible styles were added.
6. The scroll option used a non-portable `instant` value. It now uses the standard `auto` behavior.
7. Small secondary text used a low-contrast token. The prototype token was raised to a WCAG-AA-compatible contrast against its dark backgrounds.

## Remaining intentional limitations

- Scan, checkout, unlock and competitor buttons are visual design controls only; they intentionally do not call production APIs.
- The scores, findings and before/after values are fictional prototype content, clearly labelled as such.
- The review file uses the browser's built-in gzip decompression API; open it in a current mainstream browser.
- This QA verifies the standalone review prototype in Chromium. Production implementation will require separate unit, integration, accessibility and end-to-end tests against real report data and payment flows.
