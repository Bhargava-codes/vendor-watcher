# Capture & Diff Engine (E1)

Replace the paste box as the primary path: give the agent a URL, it fetches the page server-side, remembers what it said last time, and detects the change itself on re-run. The diff it produces feeds straight into the existing classifier.

## What ships

- **Watches panel** on the home page: the four vendor watches (URL, vendor, dependency position, last checked, last status) with a "Run watch" per row and "Run all".
- **Mock changelog page** at `/mock/deepgram-changelog` that we control, with a small editor-free toggle (`?v=1` / `?v=2`) so run 1 stores a baseline and run 2 shows a real detected diff on camera.
- **Capture & diff backend**: fetch → extract clean markdown → hash → compare to last snapshot → baseline / no_change / changed / error, per the state machine. Hash check is the cost gate; unchanged re-runs never reach the classifier.
- **Status feed** wired to the real run: `fetching → extracting → hashing → comparing → change detected (N hunks) → classifying → done`, plus the baseline / no-change / error lines.
- **Auto-triage**: on `changed`, the diff goes to the existing classifier with TODAY + USAGE_MANIFEST, and the ranked report renders with no pasting. Result stored as the audit trail.
- **Action trail**: past runs per watch (detected_at, status, priorities produced) readable from the changes table.
- **Graceful failures**: 404, timeout (one retry), blocked/403, redirect noted, empty extract, and page-removed → `content_removed`. Each renders a readable feed line, never a crash.
- **Firecrawl path** for one real vendor changelog (JS-rendered / bot-protected), used when a watch is marked `use_firecrawl`. Requires connecting the Firecrawl connector.
- Paste box stays, demoted to a fallback/dev tool. Seed report stays so the demo can't dead-end.

## Narrated as v2 (not built)

Scheduled/cron polling, multi-URL crawl, webhook/ticket delivery, visual diffing, auth-gated pages, correction feedback loop. Shown in the existing roadmap strip.

## Technical notes

- **Backend**: this app is TanStack Start, so the capture-and-diff "edge function" is a server function (`src/lib/capture.functions.ts`) plus server-only helpers — same contract as the spec (`{url, watch_id}` in, `{status, diff, fetched_at, error}` out), same security property: the vendor page is never fetched from the browser (CORS + bot protection), and the Firecrawl key stays server-side.
- **Database**: Lovable Cloud gets enabled and the migration creates `watches`, `snapshots`, `changes`, and `usage_manifest` exactly as specced, with grants + RLS (public read for the demo, writes via the server function). Seeded with the four vendor watches, and the mock watch pre-staged with a baseline snapshot so the first live run already shows a diff.
- **Extraction**: strip script/style/nav/header/footer/aside and convert to markdown, normalising whitespace — noise layer 1. Hash is SHA-256 of the normalised markdown.
- **Diff**: line-level unified diff grouped under the nearest markdown heading, ignoring whitespace-only and pure-reorder changes — noise layer 2. Output shape matches what the classifier's `DIFF` already expects, so E2 is untouched.
- **Firecrawl**: called through the connector gateway from the server function; `changeTracking` output is normalised into the same `{status, diff}` contract so the front end has one code path.
- Fetch is bounded by a timeout, one retry, and a response-size cap.

## What I need from you

The Firecrawl step needs a connector linked to this project — I'll surface the connect card when we get to that step. Everything else runs on the mock page with no external accounts.
