# DriftWatch

DriftWatch is a dependency-drift monitor for voice-agent stacks. It watches the changelogs and docs of the vendors you depend on (STT, LLM, TTS, noise-cancel, orchestration, telephony), diffs each new version against the previous one, and uses an LLM classifier to surface only the changes that can break your live call path — pre-scored by severity and routed to the right owner.

## What it does

- **Monitors vendor pages** — Add a vendor URL or a dated changelog feed (e.g., Deepgram, ElevenLabs) and DriftWatch will remember what it said last time.
- **Detects changes automatically** — On the next run it fetches the page again, computes a clean structured diff, and stores the new snapshot.
- **Classifies impact** — The diff is passed through an LLM classifier that scores the change by priority (P0–P3 / noise), call-path impact, certainty, time-to-impact, and action cost.
- **Routes to owners** — Each change is routed to the right team: engineering ticket, QA re-benchmark, finance review, security review, or human review.
- **Keeps a ranked inbox** — The Inbox shows the highest-priority changes first, with a diff drawer and the classifier's reasoning for every row.

## Tech stack

- **Frontend:** TanStack Start, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Lovable Cloud (Supabase) with Row-Level Security
- **Classifier:** Lovable AI Gateway (OpenAI model)
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
