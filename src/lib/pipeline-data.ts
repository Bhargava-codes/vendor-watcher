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
  "vector_store",
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
  "pinecone",
  "langgraph",
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
    id: "rag-agent",
    label: "RAG agent",
    name: "RAG agent",
    description: "A retrieval agent with a language model, embeddings, vector store, and agent framework.",
    archetype: "agentic",
    verification: "starter_example",
    setupNote: "A configurable starting point. Confirm the exact models, index, and framework version used by your agent.",
    sourceReferences: [],
    components: [
      { id: "rag-llm", layer: "llm", vendorId: "anthropic", modelId: null, modelTracking: "alias" },
      { id: "rag-embeddings", layer: "embeddings", vendorId: "openai", modelId: "text-embedding-3-small", modelTracking: "pinned" },
      { id: "rag-vector-store", layer: "vector_store", vendorId: "pinecone", modelId: null, modelTracking: "managed" },
      { id: "rag-orchestration", layer: "orchestration", vendorId: "langgraph", modelId: null, modelTracking: "not_sure" },
    ],
  },
  {
    id: "multi-agent-workflow",
    label: "Multi-agent workflow",
    name: "Multi-agent workflow",
    description: "An orchestrated agent workflow with tools and guardrails.",
    archetype: "agentic",
    verification: "starter_example",
    setupNote: "A configurable example for a multi-agent runtime. Set your actual model and framework versions before monitoring.",
    sourceReferences: [],
    components: [
      { id: "multi-llm", layer: "llm", vendorId: "openai", modelId: null, modelTracking: "alias" },
      { id: "multi-orchestration", layer: "orchestration", vendorId: "langgraph", modelId: null, modelTracking: "not_sure" },
      { id: "multi-tools", layer: "tools", vendorId: "e2b", modelId: null, modelTracking: "managed" },
      { id: "multi-guardrails", layer: "guardrails", vendorId: "anthropic", modelId: null, modelTracking: "managed" },
    ],
  },
  {
    id: "pipecat-voice",
    label: "Voice agent (Pipecat)",
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
    label: "Tool-use agent",
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
  impact: string;
  action: string;
  disclosure: string;
  illustrativeOnly: true;
}

/** Synthetic previews only; never present these as current vendor announcements. */
export const SAMPLE_DIFFS = [
  {
    id: "example-model-alias",
    title: "Model alias target changed",
    layer: "llm",
    before: 'model = "provider/model-alias" → model-a',
    after: 'model = "provider/model-alias" → model-b',
    priority: "P1",
    impact: "The same deployment can start producing different answers without a code change.",
    action: "Run your evaluation set against the new target, then pin a checkpoint if the results regress.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-endpoint-deprecation",
    title: "Streaming endpoint deprecated",
    layer: "stt",
    before: "endpoint status: supported",
    after: "endpoint status: deprecated; migration deadline supplied by vendor",
    priority: "P1",
    impact: "Live transcription keeps working temporarily, but the integration now has a migration deadline.",
    action: "Move streaming traffic to the replacement endpoint and replay a representative call set.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-tool-schema",
    title: "Tool argument becomes required",
    layer: "tools",
    before: 'arguments: { "query": "..." }',
    after: 'arguments: { "query": "...", "region": "..." }',
    priority: "P0",
    impact: "Existing tool calls can fail at runtime when the agent omits the newly required argument.",
    action: "Update the tool schema and add a contract test for the agent's generated arguments.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-voice-retirement",
    title: "Voice ID retirement announced",
    layer: "tts",
    before: 'voice_id = "voice-example-a" → active',
    after: 'voice_id = "voice-example-a" → retiring; replacement required',
    priority: "P1",
    impact: "New sessions can lose their configured voice or fail synthesis after the retirement date.",
    action: "Select a replacement voice, compare latency and pronunciation, then update the environment config.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-managed-speech-model",
    title: "Managed speech model default changed",
    layer: "speech_model",
    before: "managed speech default = stable-a",
    after: "managed speech default = stable-b",
    priority: "P1",
    impact: "Turn-taking, latency, and speech quality can shift together in a managed pipeline.",
    action: "Replay barge-in and interruption scenarios before accepting the new managed default.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-telephony-webhook",
    title: "Call webhook payload changed",
    layer: "telephony",
    before: 'event: { "call_id": "...", "status": "completed" }',
    after: 'event: { "call_id": "...", "status": "completed", "schema_version": 2 }',
    priority: "P2",
    impact: "Strict webhook deserializers may reject the new payload even though the call itself succeeds.",
    action: "Verify webhook parsing and signature handling against the versioned payload.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-memory-retention",
    title: "Memory retention default changed",
    layer: "memory",
    before: "session retention = unlimited",
    after: "session retention = 30 days by default",
    priority: "P1",
    impact: "Long-running agents can silently lose historical context and stored customer state.",
    action: "Set an explicit retention policy and verify it against your product requirements.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-embedding-dimensions",
    title: "Embedding output dimensions changed",
    layer: "embeddings",
    before: "embedding dimensions = 1536",
    after: "embedding dimensions = 3072",
    priority: "P0",
    impact: "New vectors can become incompatible with the existing index and break retrieval writes.",
    action: "Create a compatible index and plan a controlled backfill before switching models.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-vector-index-contract",
    title: "Vector index dimension changed",
    layer: "vector_store",
    before: "index dimensions = 1536; metric = cosine",
    after: "index dimensions = 3072; metric = cosine",
    priority: "P0",
    impact: "New embedding writes can fail or retrieval can silently degrade when the index no longer matches the model output.",
    action: "Keep embedding and index dimensions aligned, create a compatible index, and run a retrieval regression check before cutover.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-guardrail-schema",
    title: "Guardrail response schema changed",
    layer: "guardrails",
    before: 'result: { "allowed": true }',
    after: 'result: { "allowed": true, "policy_revision": "v2" }',
    priority: "P2",
    impact: "Strict response validation can turn an otherwise successful guardrail check into an error.",
    action: "Update response parsing and test both allowed and blocked outcomes.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
  {
    id: "example-orchestration-config",
    title: "Orchestration config key renamed",
    layer: "orchestration",
    before: "config.interruptions = true",
    after: "config.turn_handling.interruptions = true",
    priority: "P0",
    impact: "The old key can be ignored, changing interruption behavior without a deploy-time error.",
    action: "Migrate the config key and run an interruption smoke test on a staging agent.",
    disclosure: "Synthetic example — not a current vendor announcement.",
    illustrativeOnly: true,
  },
] as const satisfies readonly SampleDiff[];

export const COMPONENT_LAYER_LABEL: Record<ComponentLayer, string> = {
  stt: "Speech to text",
  llm: "Language model",
  tts: "Text to speech",
  speech_model: "Speech model",
  telephony: "Telephony",
  tools: "Tool execution",
  memory: "Memory",
  embeddings: "Embeddings",
  vector_store: "Vector store",
  guardrails: "Guardrails",
  orchestration: "Orchestration",
};

export const COMPONENT_LAYER_SHORT_LABEL: Record<ComponentLayer, string> = {
  stt: "STT",
  llm: "LLM",
  tts: "TTS",
  speech_model: "Speech",
  telephony: "Phone",
  tools: "Tools",
  memory: "Memory",
  embeddings: "Embed",
  vector_store: "Vector",
  guardrails: "Safety",
  orchestration: "Runtime",
};

export const VENDOR_LABEL: Record<VendorId, string> = {
  deepgram: "Deepgram",
  openai: "OpenAI",
  anthropic: "Anthropic",
  elevenlabs: "ElevenLabs",
  cartesia: "Cartesia",
  groq: "Groq",
  twilio: "Twilio",
  livekit: "LiveKit",
  vapi: "Vapi",
  retell: "Retell",
  pipecat: "Pipecat",
  e2b: "E2B",
  supabase: "Supabase",
  langchain: "LangChain",
  pinecone: "Pinecone",
  langgraph: "LangGraph",
};

export const LAYER_VENDOR_OPTIONS: Record<ComponentLayer, readonly VendorId[]> = {
  stt: ["deepgram", "openai", "groq"],
  llm: ["openai", "anthropic", "groq", "vapi", "retell"],
  tts: ["elevenlabs", "cartesia", "deepgram", "vapi", "retell"],
  speech_model: ["retell", "openai", "vapi"],
  telephony: ["twilio", "livekit", "pipecat", "vapi", "retell"],
  tools: ["e2b", "langchain", "livekit", "pipecat"],
  memory: ["supabase", "langchain"],
  embeddings: ["openai", "supabase"],
  vector_store: ["pinecone", "supabase"],
  guardrails: ["openai", "anthropic", "langchain"],
  orchestration: ["pipecat", "livekit", "vapi", "retell", "langchain", "langgraph"],
};

export const TRACKING_MODE_LABEL: Record<ModelTrackingMode, string> = {
  pinned: "Pinned",
  alias: "Dynamic alias",
  managed: "Provider managed",
  not_sure: "Not sure",
};

export function pipelineFromPreset(presetId: string): DeveloperPipeline {
  const preset = PIPELINE_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown pipeline preset: ${presetId}`);
  return {
    name: preset.name,
    archetype: preset.archetype,
    components: preset.components.map((component): PipelineComponent => {
      const source: PipelineComponent = component;
      const cloned: PipelineComponent = {
        id: source.id,
        layer: source.layer,
        vendorId: source.vendorId,
        modelId: source.modelId,
        modelTracking: source.modelTracking,
      };
      if (source.region) cloned.region = source.region;
      if (source.useCases) cloned.useCases = [...source.useCases];
      if (source.voiceId) cloned.voiceId = source.voiceId;
      return cloned;
    }),
  };
}

export function updatePipelineComponent(
  pipeline: DeveloperPipeline,
  componentId: string,
  patch: Partial<Omit<PipelineComponent, "id" | "layer">>,
): DeveloperPipeline {
  return {
    ...pipeline,
    components: pipeline.components.map((component) =>
      component.id === componentId ? { ...component, ...patch } : component,
    ),
  };
}

export function addPipelineLayer(
  pipeline: DeveloperPipeline,
  layer: ComponentLayer,
  componentId: string,
): DeveloperPipeline {
  const vendorId = LAYER_VENDOR_OPTIONS[layer][0];
  if (!vendorId) throw new Error(`No vendor available for layer: ${layer}`);
  return {
    ...pipeline,
    components: [
      ...pipeline.components,
      { id: componentId, layer, vendorId, modelId: null, modelTracking: "not_sure" },
    ],
  };
}

export function removePipelineComponent(
  pipeline: DeveloperPipeline,
  componentId: string,
): DeveloperPipeline {
  return {
    ...pipeline,
    components: pipeline.components.filter((component) => component.id !== componentId),
  };
}

export function sampleDiffForLayer(layer: ComponentLayer): SampleDiff {
  return SAMPLE_DIFFS.find((diff) => diff.layer === layer) ?? SAMPLE_DIFFS[0]!;
}