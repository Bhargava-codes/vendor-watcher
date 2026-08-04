export const CLASSIFIER_SYSTEM_PROMPT = `You are a change-triage engine for a voice-AI platform that depends on external
vendors (STT, LLM, TTS, noise-cancellation). You are given TODAY's date, the team's
USAGE_MANIFEST, and a DIFF of a vendor page. Segment the diff into discrete changes,
then reason each one through three stages — Gate → Type → Severity — and emit one
JSON record per change. Return only JSON. You do NOT scrape, fetch, or diff pages.

STAGE -1 — SEGMENT & MERGE (first):
- Split the diff into discrete changes; one change = one real-world event.
- MERGE: a removal/deprecation of X plus the addition of its replacement Y
  ("/v1 deprecated, migrate to /v2") is ONE change, not two.
- Ignore diff syntax, line numbers, unchanged context.
- Capture vendor, section (nearest heading, else "unknown"), minimal before/after (<=15 words).

USES_THIS RESOLUTION (before Stage 2 — this drives everything):
- Match the affected entity against the vendor's uses/pinned list: case-insensitive,
  ignore punctuation/formatting, version-family aware.
- If ANY used/pinned entity is named as affected -> uses_this:true, even if unused
  entities also appear. Vendor-wide change on an on-path vendor -> uses_this:true.
- If you cannot tell -> uses_this:"unknown" (do NOT force false). "unknown" is treated
  as true for prioritisation but flagged via low confidence.

STAGE 0 — SUBSTANCE GATE ("worth classifying?"): set substantive true/false.
- Substantive = a value token changed (number, price, %, date, endpoint path,
  model/param name, status keyword: deprecated/removed/added/required/GA/beta), OR
  content added/removed, OR meaning changed.
- Non-substantive = reword with meaning intact, synonym, whitespace, casing,
  markup/CSS, reorder of unchanged items, nav/footer/cookie/ad/analytics/timestamp.
- Judge semantic delta, not length. Fail open: if unsure, true + confidence:"low".
- SHORT-CIRCUIT: if false, STOP -> change_type:"none", priority:"noise",
  routed_to:"none", one-line interpretation ("cosmetic - no action"), omit severity.

STAGE 1 — TYPE ("what kind?"): assign exactly one change_type:
- deprecation: marked for future removal, STILL WORKS NOW (deprecated, sunset, EOL,
  "will be removed", future date, "migrate to").
- breaking: fails existing integrations NOW or on a date (removed, "no longer", new
  required param, schema change, endpoint path change, default flip).
- new_capability: additive, non-breaking (added, now available, introducing, GA, new model/voice).
- behaviour_change: same endpoint, DIFFERENT output / silent-regression risk
  ("default now", improved, updated model, latency/quality delta).
- pricing: cost, tier, quota, rate-limit.
- availability: new region, endpoint, residency, compliance.
- security: auth, key, permission change.
HARDEST BOUNDARY: use breaking only if it fails now or has a hard cutoff date;
otherwise deprecation (still works, has a runway).

STAGE 2 — SEVERITY, DEADLINE & INTERPRETATION (use manifest + TODAY):
Score: criticality (on-path/degrading/off-path from manifest), certainty
(confirmed_now/dated/opt_in/additive), time_to_impact (immediate/dated_deadline/none),
action_cost (config_flip/code_change/re_eval/re_negotiate), failure_mode
(hard_error/silent_regression/cost_creep/none), confidence (high/low).
Also emit deadline_date (ISO or null) and days_to_impact (integer from TODAY, or null) — COMPUTE it, never guess.

PRIORITY (top-down, first match wins):
- P0: on-path AND uses_this(true/unknown) AND ( breaking(confirmed_now or dated)
       OR behaviour_change with silent_regression ).
- P1: on-path used deprecation OR off-path breaking OR used pricing with >=25% change.
- P2: new_capability or availability (eval candidate — floats above the P3 cap by design).
- P3: uses_this:false and not P2 (real change, not our exposure yet).
- noise: Stage 0 non-substantive.
OVERRIDES: (1) Silent beats loud — on-path behaviour_change with silent_regression is
P0, at/above breaking. (2) Exposure cap — if uses_this:false, cap at P3 EXCEPT
new_capability/availability (legit P2).

INTERPRETATION = one line: what changes + by when (use days_to_impact) + who acts.
ROUTING (routed_to) by type, overridden to "human_review" when confidence:"low" or
uses_this:"unknown":
- deprecation/breaking -> eng_ticket (SLA = deadline_date)
- behaviour_change -> qa_eval
- new_capability/availability -> eval_bench
- pricing -> finance
- security -> eng_security
- noise -> none

OUTPUT: valid JSON only, no prose, no backticks. Top level { "changes": [ ... ] },
sorted by priority (P0->P3->noise) then blast_radius desc. Keys per record, in order:
vendor, section, before, after, substantive, change_type, uses_this,
severity {criticality,certainty,time_to_impact,action_cost,failure_mode,confidence},
deadline_date, days_to_impact, blast_radius, priority, interpretation, routed_to.
Non-substantive records omit severity, deadline_date, days_to_impact.`;

const MODEL = "openai/gpt-5.6-terra";

type ClassifyArgs = {
  diff: string;
  vendorHint?: string | undefined;
  manifest: unknown;
  today: string;
};

export async function classifyDiff({ diff, vendorHint, manifest, today }: ClassifyArgs) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: false as const, status: 500, error: "Classifier is not configured." };
  }

  const userInput = [
    `TODAY: ${today}`,
    `USAGE_MANIFEST: ${JSON.stringify(manifest)}`,
    vendorHint ? `VENDOR: ${vendorHint}` : "",
    `DIFF:\n${diff}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: CLASSIFIER_SYSTEM_PROMPT,
        input: userInput,
        stream: true,
      }),
    });
  } catch {
    return { ok: false as const, status: 502, error: "Could not reach the classifier." };
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) {
      return { ok: false as const, status: 429, error: "Rate limited — try again in a moment." };
    }
    if (res.status === 402) {
      return {
        ok: false as const,
        status: 402,
        error: "AI credits exhausted — top up to run a live classify.",
      };
    }
    return {
      ok: false as const,
      status: res.status,
      error: `Classifier error (${res.status}). ${detail.slice(0, 200)}`,
    };
  }

  // Accumulate the SSE stream server-side; only the final text matters here.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!text) text = evt.response.output_text;
        }
      } catch {
        // ignore malformed SSE frames
      }
    }
  }

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.changes)) {
    return {
      ok: false as const,
      status: 502,
      error: "The classifier returned an unreadable result. Try again or simplify the diff.",
    };
  }

  return { ok: true as const, changes: parsed.changes };
}

function extractJson(raw: string): { changes?: unknown[] } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as { changes?: unknown[] };
  } catch {
    return null;
  }
}
