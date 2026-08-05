# DriftWatch — full product build

Rebuild the current single-page demo into the six-view enterprise app in the spec, keeping the classification engine and capture/diff work that already exists underneath.

## What changes

**Shell (new).** Dark navy sidebar with "DriftWatch / Voice Platform · Prod", nav groups *Monitor* (Change inbox, Watches, Vendors & usage, Trends) and *Workspace* (Settings, How it works), user card pinned bottom. White topbar with breadcrumb + title, search field, primary "Run watch" button, bell with dot. Selecting nav swaps the main panel in place — no page navigation.

**Change inbox (default).** Four KPI cards, dashed noise banner with "See what we filtered →", toolbar with count and All/P0/P1/P2/Noise chips, and the ranked table (priority pill · vendor+role · after text + humanised type tag · route · deadline · status). Rows open the detail drawer.

**Detail drawer.** Right slide-over: header pills, before/after monospace diff, "Why it matters", "Why this priority", six severity cells (or the noise line), footer with the routing action button + "Mark as wrong" (logged; "Dismiss" for noise).

**Watches.** Two-touch add: "+ Add watch" reveals an inline card (URL autofocused) → paste URL + pick a role chip (STT/LLM/TTS/Noise) → Add. Provider inferred from domain, dependency position inferred from role. Table: vendor page · provider · role · last checked · status · hover remove. The old per-row "Run this watch" box, cadence column and console log are removed.

**Vendors & usage.** One card per vendor: role, position badge, "we use" tags with pins, one-line impact sentence.

**Trends.** Changes-by-priority and changes-by-vendor bar cards, open deprecation deadlines list, labelled illustrative.

**Settings.** Four segmented rows: surface uncertain changes (on), pricing threshold ≥25%, uncertain changes → human review, page fetching → Firecrawl.

**How it works.** Three-step explainer (Capture / Reason / Route).

**Run watch pipeline.** Topbar button blurs the content behind a skeleton and opens a centered modal with the 6-step stepper (Capture, Compare, Analyze, Classify, Prioritize, Route), ~1.5s each, present-tense copy, spinner → green check. Footer ends "All done — 2 changes need your attention", overlay closes back into the inbox, toast fires. Double-click guarded; `prefers-reduced-motion` passes instantly.

**Live classify path.** One watch runs for real: server-side capture → diff → classifier → the result renders in the same inbox, ranked alongside the seed rows. Bad URL / blocked page / empty extract each surface a readable inline error instead of a crash. Seed data stays as the reliable default so the inbox is populated on first load.

**Copy pass.** Every machine value mapped through the TYPE/ROUTE label tables; no "gate", "manifest", "cadence", "MVP" strings in the UI; sentence case; second person.

## Technical notes

- Design tokens (nav #141B2E, bg #F6F7F9, primary #4C5BD4, P0–noise severity scale with soft tints, Inter + JetBrains Mono, tabular numerals) go into `src/styles.css` as semantic tokens; components use tokens only. Icons switch to `lucide-react`.
- The app becomes a shell route with in-place view switching, split into `src/components/driftwatch/*` (sidebar, topbar, inbox, drawer, watches, vendors, trends, settings, how-it-works, run overlay) so no file gets unwieldy.
- Database: `watches` gains a `role` column (STT/LLM/TTS/noise-cancel) and the seeded rows get roles; `snapshots`, `changes`, `usage_manifest` stay as-is. Add/remove watch and "Mark as wrong" write through server functions.
- Existing `capture.server.ts` (fetch, extract, hash, structured diff), `capture.functions.ts` (runWatch) and `classifier.server.ts` (the staged prompt) are reused; the prompt is updated to the spec's wording where it differs, and the mock changelog page stays as the controlled demo target.
- Firecrawl stays the stated production fetch path (shown in Settings) but is not required for the demo — plain server-side fetch drives the mock page. If you want the real-vendor proof, I'll surface a connect card for Firecrawl at that point.

## Classifier model

The spec names Claude Sonnet, but you've confirmed we keep the current model: the classifier stays on `openai/gpt-5.6-terra` through the Lovable AI Gateway, with the staged prompt unchanged.
