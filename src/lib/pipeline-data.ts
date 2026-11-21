import type { Priority } from "@/lib/drift-data";

export const PIPELINE_ARCHETYPES = ["voice", "agentic", "hybrid"] as const;
export type PipelineArchetype = (typeof PIPELINE_ARCHETYPES)[number];

export const COMPONENT_LAYERS = [
  "stt",
  "llm",
  "tts",
  "speech_model",
  "telephony",
  "tools",
  "memory",
  "embeddings",
  "guardrails",
  "orchestration",
] as const;
export type ComponentLayer = (typeof COMPONENT_LAYERS)[number];

export const VENDOR_IDS = [
  "deepgram",
  "openai",
  "anthropic",
  "elevenlabs",
  "cartesia",
  "groq",
  "twilio",
  "livekit",
  "vapi",
  "retell",
  "pipecat",
  "e2b",
  "supabase",
  "langchain",
] as const;
export type VendorId = (typeof VENDOR_IDS)[number];

export type ModelTrackingMode = "pinned" | "alias" | "managed" | "not_sure";

export interface PipelineComponent {
  id: string;
  layer: ComponentLayer;
  vendorId: VendorId;
  modelId: string | null;
  modelTracking: ModelTrackingMode;
  region?: "us" | "eu" | "in" | "global";
  useCases?: ("live_calls" | "batch" | "internal")[];
  /** A TTS voice ID is separate from the provider's model ID. */
  voiceId?: string;
}

export interface DeveloperPipeline {
  name: string;
  archetype: PipelineArchetype;
  components: PipelineComponent[];
}

export interface PipelinePreset extends DeveloperPipeline {
  id: string;
  label: string;
  description: string;
  verification: "official_docs" | "starter_example";
  setupNote: string;
  sourceReferences: string[];
}

/**
 * Starter presets are editable examples, not claims that a vendor pairing is
 * the default or the best choice. Exact model and voice IDs remain explicit.
 */
export const PIPELINE_PRESETS = [
  {
    id: "pipecat-voice",
    label: "Pipecat voice pipeline",
    name: "Pipecat voice pipeline",
    description: "A code-first STT → LLM → TTS starter configuration.",
    archetype: "voice",
    verification: "official_docs",
    setupNote:
      "The providers are documented in Pipecat's quickstart. Choose a Cartesia voice ID before running calls.",
    sourceReferences: [
      "https://docs.pipecat.ai/pipecat/get-started/quickstart",
      "https://docs.pipecat.ai/pipecat/fundamentals/service-settings",
    ],
    components: [
      {
        id: "pipecat-stt",
        layer: "stt",
        vendorId: "deepgram",
        modelId: "nova-3",
        modelTracking: "alias",
        useCases: ["live_calls"],
      },
      {
        id: "pipecat-llm",
        layer: "llm",
        vendorId: "openai",
        modelId: "gpt-4o",
        modelTracking: "alias",
        useCases: ["live_calls"],
      },
      {
        id: "pipecat-tts",
        layer: "tts",
        vendorId: "cartesia",
        modelId: null,
        modelTracking: "not_sure",
        useCases: ["live_calls"],
      },
      {
        id: "pipecat-orchestration",
        layer: "orchestration",
        vendorId: "pipecat",
        modelId: null,
        modelTracking: "managed",
      },
    ],
  },
  {
    id: "vapi-provider-config",
    label: "Vapi voice agent",
    name: "Vapi voice agent",
    description: "A Vapi assistant with explicitly selected underlying providers.",
    archetype: "voice",
    verification: "official_docs",
    setupNote:
      "Vapi supports these providers. Pick a Cartesia voice ID; provider access and model availability can vary by account.",
    sourceReferences: [
      "https://docs.vapi.ai/providers/transcriber/deepgram",
      "https://docs.vapi.ai/providers/model/openai",
      "https://docs.vapi.ai/providers/voice/cartesia",
    ],
    components: [
      {
        id: "vapi-platform",
        layer: "orchestration",
        vendorId: "vapi",
        modelId: null,
        modelTracking: "managed",
      },
      {
        id: "vapi-stt",
        layer: "stt",
        vendorId: "deepgram",
        modelId: "nova-3",
        modelTracking: "alias",
        useCases: ["live_calls"],
      },
      {
        id: "vapi-llm",
        layer: "llm",
        vendorId: "openai",
        modelId: "gpt-4.1",
        modelTracking: "alias",
        useCases: ["live_calls"],
      },
      {
        id: "vapi-tts",
        layer: "tts",
        vendorId: "cartesia",
        modelId: null,
        modelTracking: "not_sure",
        useCases: ["live_calls"],
      },
    ],
  },
  {
    id: "retell-managed-voice",
    label: "Retell managed voice",
    name: "Retell managed voice",
    description: "A Retell-managed speech-to-speech starting point.",
    archetype: "voice",
    verification: "official_docs",
    setupNote:
      "GPT Live is for single-prompt voice agents. Choose its backend text model and a platform voice in Retell.",
    sourceReferences: [
      "https://docs.retellai.com/build/gpt-live",
      "https://docs.retellai.com/build/platform-voices",
    ],
    components: [
      {
        id: "retell-platform",
        layer: "orchestration",
        vendorId: "retell",
        modelId: null,
        modelTracking: "managed",
      },
      {
        id: "retell-speech-model",
        layer: "speech_model",
        vendorId: "retell",
        modelId: "gpt-live-1",
        modelTracking: "managed",
        useCases: ["live_calls"],
      },
      {
        id: "retell-llm",
        layer: "llm",
        vendorId: "retell",
        modelId: null,
        modelTracking: "not_sure",
        useCases: ["live_calls"],
      },
      {
        id: "retell-tts",
        layer: "tts",
        vendorId: "retell",
        modelId: null,
        modelTracking: "managed",
        useCases: ["live_calls"],
      },
    ],
  },
  {
    id: "agentic-tool-use",
    label: "Agentic tool-use starter",
    name: "Agentic tool-use starter",
    description: "A customizable LLM, sandbox, and retrieval stack.",
    archetype: "agentic",
    verification: "starter_example",
    setupNote:
      "This is a configurable example, not a verified integration recipe. Confirm providers and model IDs for your implementation.",
    sourceReferences: [],
    components: [
      {
        id: "agentic-llm",
        layer: "llm",
        vendorId: "openai",
        modelId: null,
        modelTracking: "not_sure",
        useCases: ["internal"],
      },
      {
        id: "agentic-tools",
        layer: "tools",
        vendorId: "e2b",
        modelId: null,
        modelTracking: "managed",
      },
      {
        id: "agentic-memory",
        layer: "memory",
        vendorId: "supabase",
        modelId: null,
        modelTracking: "managed",
      },
    ],
  },
] as const satisfies readonly PipelinePreset[];

export interface SampleDiff {
  id: string;
  title: string;
  layer: ComponentLayer;
  before: string;
  after: string;
  priority: Priority;
  disclosure: string;
  illustrativeOnly: true;
}

/** Synthetic previews only; never present these as current vendor announcements. */
export const SAMPLE_DIFFS = [
  {
    id: "example-model-alias",
    title: "Example: model alias target changed",
    layer: "llm",
    before: 'model = "provider/model-alias" → model-a',
    after: 'model = "provider/model-alias" → model-b',
    priority: "P1",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-endpoint-deprecation",
    title: "Example: endpoint deprecation announced",
    layer: "stt",
    before: "endpoint status: supported",
    after: "endpoint status: deprecated; migration deadline supplied by vendor",
    priority: "P1",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-tool-schema",
    title: "Example: tool argument becomes required",
    layer: "tools",
    before: 'arguments: { "query": "..." }',
    after: 'arguments: { "query": "...", "region": "..." }',
    priority: "P0",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
] as const satisfies readonly SampleDiff[];