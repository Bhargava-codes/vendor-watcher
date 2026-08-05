# DriftWatch

DriftWatch is a dependency-drift monitor for voice-agent stacks. It watches the changelogs and docs of the vendors you depend on (STT, LLM, TTS, noise-cancel, orchestration, telephony), diffs each new version against the previous one, and uses an LLM classifier to surface only the changes that can break your live call path — pre-scored by severity and routed to the right owner.

## What it does

- **Monitors vendor pages** — Add a vendor URL or a dated changelog feed (e.g., Deepgram, ElevenLabs) and DriftWatch will remember what it said last time.
- **Detects changes automatically** — On the next run it fetches the page again, computes a clean structured diff, and stores the new snapshot.
- **Classifies impact** — The diff is passed through an LLM classifier that scores the change by priority (P0–P3 / noise), call-path impact, certainty, time-to-impact, and action cost.
- **Routes to owners** — Each change is routed to the right team: engineering ticket, QA re-benchmark, finance review, security review, or human review.
- **Keeps a ranked inbox** — The Inbox shows the highest-priority changes first, with a diff drawer and the classifier's reasoning for every row.

## Architecture

```text
  Run watch (UI)
        |
        v
  runWatch  (server function, src/lib/capture.functions.ts)
        |
        +-- kind = "page"  -----> safeFetch -> HTML -> clean markdown
        |                          (capture.server.ts, url-guard.server.ts)
        |
        +-- kind = "dated_feed" -> probe /YYYY/M/D.md over a 7-day window
                                   + parse the vendor's "Similar pages" index
                                   (changelog-feed.server.ts)
        |
        v
  content hash -> unchanged? stop early (no LLM call, no inbox row)
        |
        v
  structured diff vs. last snapshot  (capture.server.ts)
        |
        v
  LLM classifier + usage manifest    (classifier.server.ts, Lovable AI Gateway)
   priority P0-P3 / noise, call-path impact, certainty, deadline, owner
        |
        v
  snapshots + changes tables (Supabase)  ->  Change inbox + Agent trail (UI)
```

Key decisions:

- **Snapshot then diff, never re-scrape history.** Each visit stores a content hash; an unchanged hash exits before the diff and before any LLM call, so re-runs are cheap.
- **Two capture strategies.** Vendors like Deepgram and ElevenLabs publish date-addressed changelog entries, so those are read entry by entry instead of diffing one long page. Everything else is a whole-page snapshot.
- **Formatting vs. content.** HTML is reduced to clean markdown before hashing, so nav, chrome and markup churn cannot masquerade as a content change. The classifier then splits remaining edits into real changes vs. noise.
- **SSRF guard.** All outbound fetches go through `url-guard.server.ts`, which blocks private/link-local addresses and re-validates every redirect hop.
- **Agent trail.** Each server step returns a feed line; the UI turns those into a timestamped log of what the agent did and why (`src/lib/agent-trail.ts`, `AgentTrailView.tsx`). The run overlay renders that same live stream — it is real progress, not a canned animation.

### Where things live

| Path | Role |
| --- | --- |
| `src/lib/capture.functions.ts` | Server functions: `runWatch`, `addWatch`, `removeWatch`, `resetMockBaseline` |
| `src/lib/capture.server.ts` | Fetch, markdown extraction, hashing, structured diff |
| `src/lib/changelog-feed.server.ts` | Dated changelog discovery for Deepgram / ElevenLabs |
| `src/lib/classifier.server.ts` | LLM classification and routing |
| `src/lib/url-guard.server.ts` | SSRF protection for outbound fetches |
| `src/components/driftwatch/` | Shell, inbox, drawer, watches, trail, run overlay |
| `supabase/migrations/` | Schema for `watches`, `snapshots`, `changes` |

## The target page (for evaluating change detection)

`src/routes/mock/deepgram-changelog.tsx` is a local changelog page with two
versions (v1 and v2) that differ in copy, a pricing number and a deprecation
notice. "Run watch" resets the baseline to v1 and then reads v2, so a change is
detected and classified on every run. Real vendor changelogs are wired in
alongside it.

## Tech stack

- **Frontend:** TanStack Start, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Lovable Cloud (Supabase) with Row-Level Security
- **Classifier:** Lovable AI Gateway (`openai/gpt-5.6-terra`)
- **Build tool:** Vite 7

## Local development

Requirements: Node.js 22+ and `bun` or `npm`.

```sh
# 1. Clone the repo
git clone <repository-url>
cd driftwatch

# 2. Install dependencies
bun install
# or: npm install

# 3. Set up environment variables
cp .env.example .env
# Then fill in the values from your Lovable Cloud project settings.

# 4. Run the dev server
bun run dev
# or: npm run dev
```

The app will be available at `http://localhost:8080`.

## Environment variables

See `.env.example` for the required variables. Most are managed automatically by Lovable Cloud; `LOVABLE_API_KEY` is needed locally only if you want to run the classifier outside of Lovable's hosted environment.

## Database

The project uses Lovable Cloud (Supabase). Migrations live under `supabase/migrations/`. The core tables are:

- `watches` — the vendor pages and feeds you are monitoring
- `snapshots` — stored captures of each page/feed entry
- `changes` — detected diffs and classifier output
- `usage_manifest` — your team's pinned endpoints and usage per vendor

## Adding a new vendor

1. Go to the **Watches** view in the app.
2. Paste the vendor URL or changelog page and choose the role (STT, LLM, TTS, noise-cancel, etc.).
3. Click **Run watch** to baseline the page and start detecting changes.

For dated changelog feeds (Deepgram, ElevenLabs), the app will auto-detect the feed structure and discover entries by date.

## License

MIT
