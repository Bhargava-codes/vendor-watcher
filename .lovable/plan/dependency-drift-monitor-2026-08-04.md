# Dependency Drift Monitor

A single-page app that watches vendor pages a voice-AI platform depends on, classifies each change by type and severity against the team's usage manifest, and renders a ranked, routed change report.

## What ships (MVP)

- One page at `/` (max-width ~900px), dark instrument-panel aesthetic per the spec tokens.
- Header: eyebrow "DEPENDENCY DRIFT MONITOR", title "Vendor watch", subtitle, "Run watch" button top-right.
- Watch chips: Deepgram (STT · on-path), OpenAI (LLM · on-path), ElevenLabs (TTS · on-path), Krisp (noise-cancel · degrading).
- Status feed (monospace, dark) streaming the seven lines ~380ms apart with a blinking cursor; instant/no-animation under `prefers-reduced-motion`.
- Ledger row: P0 / P1 / P2 / noise tally chips + "View raw JSON" toggle.
- Ranked report cards (P0 → noise), each with severity bar, priority pill, vendor, type tag, `→ routed_to`, before(−)/after(+) diff, interpretation, severity chips, deadline chip when dated. Noise card dimmed.
- JSON toggle swaps the report for the raw `{ "changes": [...] }` object.
- Ships with the six seeded changes so "Run watch" renders reliably on first load with no network call.
- Live classify path: a "Classify a real diff" panel — paste a diff + pick vendor, runs the §7 system prompt server-side, streams the same status feed, and renders the returned changes in the same report. Readable error states for empty input, bad/oversized input, rate limit (429), credits (402), and malformed model output — never a crash.
- "Mark as wrong / re-classify" affordance on each card; corrections logged in-session and shown in an action trail line.

## Narrated as v2 (not built)

Scheduled multi-vendor polling, URL fetch + snapshot storage, Firecrawl monitor/changeTracking, real Jira/Slack routing, vendor-wide blast-radius fan-out, correction feedback loop, leadership digest. These appear as a short "Roadmap" strip at the bottom, visibly marked as not live.

## Technical notes

- Stack: existing TanStack Start app. Home route rewritten as the monitor; no database — seed data is a local module, corrections live in component state.
- Live classify runs through a server route (`/api/classify`) so the API key never reaches the browser. It streams progress and returns the parsed `changes` array; the §7 prompt is sent verbatim as the system prompt with `TODAY` (current ISO date) and the seeded `USAGE_MANIFEST` injected, plus the pasted `DIFF`.
- Model: the brief names Claude Sonnet, which is not available through Lovable AI. I'll use the closest supported frontier reasoning model instead (an OpenAI GPT-5.x class model via the Responses API), same prompt, same JSON contract. Say the word if you'd rather I use a Gemini model.
- Output is parsed defensively: if the model returns non-JSON or a record missing keys, the UI shows a readable classifier error instead of failing.
- Design tokens (base #0E1620, panel #151F2B, line #243244, ink #E7EEF5, beacon #4FD1C5, priority ramp P0 #F0616D → noise #3B4757) go into `src/styles.css` as semantic tokens; components use those tokens only, no hardcoded colors.
- Fonts Space Grotesk / Inter / JetBrains Mono loaded via a `<link>` in the root route head.
- Route `head()` gets an app-specific title/description/OG tags.
- Accessibility: keyboard-focusable Run and toggle, reduced-motion respected, responsive down to mobile.
