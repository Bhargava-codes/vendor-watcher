export type Priority = "P0" | "P1" | "P2" | "P3" | "noise";

export type Severity = {
  criticality: string;
  certainty: string;
  time_to_impact: string;
  action_cost: string;
  failure_mode: string;
  confidence: string;
};

export type Change = {
  vendor: string;
  section: string;
  before: string;
  after: string;
  substantive: boolean;
  change_type: string;
  uses_this: boolean | "unknown";
  severity?: Severity;
  deadline_date?: string | null;
  days_to_impact?: number | null;
  blast_radius: number;
  priority: Priority;
  interpretation: string;
  routed_to: string;
};

export const USAGE_MANIFEST = {
  deepgram: {
    role: "STT",
    dependency_position: "on-path",
    uses: ["/v1/listen", "nova-2"],
    pinned: ["/v1/listen"],
  },
  openai: { role: "LLM", dependency_position: "on-path", uses: ["gpt-4o"], pinned: [] },
  elevenlabs: {
    role: "TTS",
    dependency_position: "on-path",
    uses: ["ProcedureCompilerMode", "eleven_turbo_v2"],
    pinned: [],
  },
  krisp: { role: "noise-cancel", dependency_position: "degrading", uses: [], pinned: [] },
};

export const WATCHED_VENDORS = [
  { name: "Deepgram", role: "STT", position: "on-path" },
  { name: "OpenAI", role: "LLM", position: "on-path" },
  { name: "ElevenLabs", role: "TTS", position: "on-path" },
  { name: "Krisp", role: "noise-cancel", position: "degrading" },
];

export const FEED_LINES = [
  "fetching 4 vendor pages",
  "snapshots stored",
  "diffing 11 hunks",
  "segmenting to 6 changes",
  "classifying vendors",
  "1 dropped as noise",
  "done, 2 at P0",
];

export const LIVE_FEED_LINES = [
  "reading pasted diff",
  "extracting structured text",
  "segmenting changes",
  "classifying against usage manifest",
];

export const PRIORITY_ORDER: Priority[] = ["P0", "P1", "P2", "P3", "noise"];

export const SEED_CHANGES: Change[] = [
  {
    vendor: "elevenlabs",
    section: "Changelog",
    before: "ProcedureCompilerMode supports append",
    after: "Removed append from ProcedureCompilerMode",
    substantive: true,
    change_type: "breaking",
    uses_this: true,
    severity: {
      criticality: "on-path",
      certainty: "confirmed_now",
      time_to_impact: "immediate",
      action_cost: "code_change",
      failure_mode: "hard_error",
      confidence: "high",
    },
    deadline_date: null,
    days_to_impact: 0,
    blast_radius: 1,
    priority: "P0",
    interpretation:
      "TTS ProcedureCompilerMode lost append — our agent flow breaks now; eng fix required immediately.",
    routed_to: "eng_ticket",
  },
  {
    vendor: "deepgram",
    section: "Models",
    before: "nova-2 (acoustic model v2.1)",
    after: "nova-2 now defaults to updated acoustic model",
    substantive: true,
    change_type: "behaviour_change",
    uses_this: true,
    severity: {
      criticality: "on-path",
      certainty: "confirmed_now",
      time_to_impact: "immediate",
      action_cost: "re_eval",
      failure_mode: "silent_regression",
      confidence: "high",
    },
    deadline_date: null,
    days_to_impact: 0,
    blast_radius: 1,
    priority: "P0",
    interpretation:
      "Our STT model nova-2 silently swapped acoustic model — accuracy may drift with no error; QA must re-benchmark before customers notice.",
    routed_to: "qa_eval",
  },
  {
    vendor: "deepgram",
    section: "Changelog",
    before: "/v1/listen",
    after: "/v1/listen deprecated; migrate to /v2 by 2026-10-15",
    substantive: true,
    change_type: "deprecation",
    uses_this: true,
    severity: {
      criticality: "on-path",
      certainty: "dated",
      time_to_impact: "dated_deadline",
      action_cost: "code_change",
      failure_mode: "hard_error",
      confidence: "high",
    },
    deadline_date: "2026-10-15",
    days_to_impact: 72,
    blast_radius: 1,
    priority: "P1",
    interpretation:
      "Our STT endpoint /v1/listen sunsets 2026-10-15 (72 days) — still works today; eng must migrate to /v2 before then.",
    routed_to: "eng_ticket",
  },
  {
    vendor: "openai",
    section: "Pricing",
    before: "gpt-4o input $2.50 / 1M tokens",
    after: "gpt-4o input $3.25 / 1M tokens",
    substantive: true,
    change_type: "pricing",
    uses_this: true,
    severity: {
      criticality: "on-path",
      certainty: "confirmed_now",
      time_to_impact: "immediate",
      action_cost: "re_negotiate",
      failure_mode: "cost_creep",
      confidence: "high",
    },
    deadline_date: null,
    days_to_impact: 0,
    blast_radius: 1,
    priority: "P1",
    interpretation:
      "gpt-4o input price up 30% — our per-call LLM cost rises; finance to update the cost model.",
    routed_to: "finance",
  },
  {
    vendor: "deepgram",
    section: "Voice Agent API",
    before: "",
    after: "Added gemini-3.5-flash as a managed LLM",
    substantive: true,
    change_type: "new_capability",
    uses_this: false,
    severity: {
      criticality: "on-path",
      certainty: "additive",
      time_to_impact: "none",
      action_cost: "re_eval",
      failure_mode: "none",
      confidence: "high",
    },
    deadline_date: null,
    days_to_impact: null,
    blast_radius: 1,
    priority: "P2",
    interpretation:
      "New managed LLM option available — benchmark latency/quality vs. our current LLM; non-urgent.",
    routed_to: "eval_bench",
  },
  {
    vendor: "krisp",
    section: "Hero",
    before: "Fast, reliable noise cancellation.",
    after: "Reliable, fast noise cancellation.",
    substantive: false,
    change_type: "none",
    uses_this: false,
    deadline_date: null,
    days_to_impact: null,
    blast_radius: 1,
    priority: "noise",
    interpretation: "Cosmetic reword — no action.",
    routed_to: "none",
  },
];

export const SAMPLE_DIFF = `## Changelog — 2026-08-01
- /v1/listen
+ /v1/listen deprecated; migrate to /v2 by 2026-10-15

## Pricing
- gpt-4o input $2.50 / 1M tokens
+ gpt-4o input $3.25 / 1M tokens

## Hero
- Fast, reliable noise cancellation.
+ Reliable, fast noise cancellation.`;
