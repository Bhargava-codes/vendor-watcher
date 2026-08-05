# Real vendor changelogs: ElevenLabs + Deepgram

Yes — this works today, no Firecrawl needed. Both vendors publish their changelogs on the same docs platform, and that platform serves a clean Markdown version of every dated entry. I verified this live just now.

## What I confirmed

- `https://developers.deepgram.com/changelog/2026/8/4.md` returns clean Markdown (headings, bullets, model names, code identifiers) — 200 OK via a plain server fetch.
- `https://elevenlabs.io/docs/changelog/2026/7/6.md` returns the same shape.
- The HTML changelog index pages are JS-rendered and messy (5 MB of Next.js payload) — we do not scrape those.
- Neither vendor exposes RSS. But requesting a non-existent `.md` under the changelog path returns a "Similar pages" list containing the most recent dated entries — a usable discovery hook alongside date probing.

## How the product uses it

A new watch type: **dated changelog feed** (vendor + base path), instead of a single URL snapshot.

On each run, per vendor:

1. **Discover** entries for the window (default: last 7 days, configurable). Probe `<<base>>/YYYY/M/D.md` for each date, plus parse the "Similar pages" hint list to catch anything outside the window. 404s are normal and silently skipped.
2. **Capture** each found entry as its own snapshot row, keyed by its date. Entry text is already Markdown, so no HTML extraction step.
3. **Diff by entry, not by page.** A dated entry is immutable once published, so the "change" is the *arrival of a new entry* (and, rarely, an edit to an existing one detected by content hash). This is a much cleaner signal than line-diffing a rolling index page.
4. **Classify** each new entry through the existing classifier (`openai/gpt-5.6-terra`) with the usage manifest, exactly as today — same P0–P3 output, same routing.
5. **Store** in the existing `snapshots` / `changes` tables and render in the Change inbox with the entry date shown.

The mock Deepgram page stays as-is so the offline demo still works.

## UI changes

- **Watches**: adding a URL that matches a known changelog base (ElevenLabs, Deepgram) is detected automatically and labelled "Dated changelog — reads new entries daily". Other URLs keep today's snapshot-diff behaviour.
- **Inbox**: change rows from a dated feed show the entry date and link to the source entry.
- **Run watch overlay**: the capture step reports "N new entries since <<date>>" instead of a single page hash.

## Daily cadence

Structure supports it: because entries are date-addressed, a daily run only fetches the last day or two and classifies whatever is new — no re-diffing of history, no duplicate rows (guarded by the content hash + entry date).

The run stays on the existing manual "Run watch" button — no scheduled job.

## Technical notes

- New `src/lib/changelog-feed.server.ts`: base-path registry for the two vendors, date-window URL builder, `.md` fetcher with 404 tolerance, "Similar pages" parser.
- `src/lib/capture.functions.ts`: `runWatch` branches on watch kind — dated feed vs. single-page snapshot.
- Migration: add `kind` ('page' | 'dated_feed') and `entry_date` (on snapshots/changes) so entries dedupe correctly.
- Requests are throttled and capped (max ~30 probes per vendor per run) to stay polite.
