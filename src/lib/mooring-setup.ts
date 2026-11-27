// Client-side Mooring setup state (UI-only until backend wiring lands).
export type BlockId = "models" | "data" | "voice";

export const BLOCKS: { id: BlockId; title: string; role: string; examples: string }[] = [
  { id: "models", title: "AI models", role: "The brain: the models that think, write and search for your agent.", examples: "LLMs · embeddings · rerankers" },
  { id: "data", title: "Data & tools", role: "The hands: where it looks things up and the tools it can use.", examples: "vector stores · frameworks · sandboxes · search APIs" },
  { id: "voice", title: "Voice", role: "The voice: how it listens and talks, if it speaks to people.", examples: "speech-to-text · text-to-speech · voice platforms" },
];

export const VENDORS: Record<BlockId, { name: string; popular?: boolean }[]> = {
  models: [
    { name: "OpenAI", popular: true }, { name: "Anthropic", popular: true }, { name: "Google Gemini", popular: true },
    { name: "Mistral" }, { name: "Groq" }, { name: "AWS Bedrock" }, { name: "Azure OpenAI" }, { name: "Cohere" },
    { name: "Voyage" }, { name: "Sarvam AI" }, { name: "Krutrim" },
  ],
  data: [
    { name: "Pinecone", popular: true }, { name: "Supabase", popular: true }, { name: "LangChain / LangGraph", popular: true },
    { name: "Weaviate" }, { name: "Qdrant" }, { name: "CrewAI" }, { name: "LlamaIndex" }, { name: "E2B" }, { name: "Tavily" },
  ],
  voice: [
    { name: "ElevenLabs", popular: true }, { name: "Deepgram", popular: true }, { name: "Vapi", popular: true },
    { name: "Retell" }, { name: "LiveKit" }, { name: "Cartesia" }, { name: "AssemblyAI" }, { name: "Twilio" },
  ],
};

export const PRODUCTS: Record<string, string[]> = {
  OpenAI: ["Responses / Chat API", "Realtime API", "Embeddings", "Audio (speech & transcription)", "Images", "Batch API", "Fine-tuning"],
  Anthropic: ["Messages API", "Tool use", "Prompt caching", "Batches API", "Files API"],
  "Google Gemini": ["Gemini API", "Live API", "Embeddings", "Vertex AI"],
  Pinecone: ["Serverless indexes", "Inference / rerank", "Assistant"],
  Supabase: ["Postgres + pgvector", "Auth", "Edge Functions", "Storage"],
  "LangChain / LangGraph": ["LangGraph runtime", "LangChain core", "LangSmith"],
  ElevenLabs: ["Text to speech", "Conversational AI", "Speech to text", "Voice cloning"],
  Deepgram: ["Speech to text (Nova)", "Text to speech (Aura)", "Voice Agent API"],
  Vapi: ["Assistants API", "Phone numbers", "Webhooks"],
};

export const OWNER_TYPES = [
  { id: "breaking", title: "Breaking changes & deprecations", detail: "Renamed parameters, retired models or endpoints, API sunsets.", role: "Engineering owner" },
  { id: "behavior", title: "Behavior & quality shifts", detail: "Model aliases repointed, latency or output-quality changes.", role: "QA / prompt owner" },
  { id: "pricing", title: "Pricing & limits", detail: "Price changes, rate limits, quota and billing updates.", role: "Finance owner" },
  { id: "security", title: "Security & compliance", detail: "Data retention, region, auth and policy changes.", role: "Security owner" },
] as const;

export type SetupState = {
  blocks: BlockId[];
  vendors: Record<BlockId, string[]>;
  products: Record<string, string[]>;
  owners: Record<string, string>;
  completed: boolean;
};

export const EMPTY_SETUP: SetupState = {
  blocks: ["models", "data"],
  vendors: { models: [], data: [], voice: [] },
  products: {},
  owners: {},
  completed: false,
};

const KEY = "mooring-setup-v1";

export function loadSetup(): SetupState {
  if (typeof window === "undefined") return EMPTY_SETUP;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY_SETUP, ...(JSON.parse(raw) as Partial<SetupState>) } : EMPTY_SETUP;
  } catch {
    return EMPTY_SETUP;
  }
}

export function saveSetup(state: SetupState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function selectedVendors(s: SetupState): string[] {
  return s.blocks.flatMap((b) => s.vendors[b]);
}

export function watchedVendors(s: SetupState): string[] {
  const v = selectedVendors(s);
  return v.length ? v : ["OpenAI", "Anthropic", "LangChain / LangGraph", "Pinecone"];
}

export function productCount(s: SetupState): number {
  return watchedVendors(s).reduce((n, v) => n + (s.products[v]?.length || (PRODUCTS[v]?.length ?? 1)), 0);
}

/** Deterministic sample score per vendor (UI placeholder until scoring backend). */
export function vendorScore(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 70 + (h % 21);
}

export function workspaceScore(vendors: string[]): number {
  if (!vendors.length) return 0;
  return Math.round(vendors.reduce((n, v) => n + vendorScore(v), 0) / vendors.length);
}

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type SampleChange = { id: string; severity: Severity; title: string; type: string; vendor: string; age: string; live?: boolean };

export const SAMPLE_CHANGES: SampleChange[] = [
  { id: "c1", severity: "Critical", title: "Model alias repointed to a new snapshot", type: "Behavior shift", vendor: "OpenAI", age: "2h ago", live: true },
  { id: "c2", severity: "Critical", title: "Agent run signature changed in a minor release", type: "Breaking change", vendor: "LangChain / LangGraph", age: "5h ago", live: true },
  { id: "c3", severity: "High", title: "Rate limits lowered on the free tier", type: "Pricing & limits", vendor: "Anthropic", age: "1d ago", live: true },
  { id: "c4", severity: "High", title: "Legacy serverless index API sunset date set", type: "Deprecation", vendor: "Pinecone", age: "2d ago" },
  { id: "c5", severity: "High", title: "Tool-call streaming format updated", type: "Breaking change", vendor: "Anthropic", age: "3d ago" },
  { id: "c6", severity: "Medium", title: "Embeddings price reduced", type: "Pricing & limits", vendor: "OpenAI", age: "4d ago" },
  { id: "c7", severity: "Medium", title: "Default data retention window changed", type: "Security & compliance", vendor: "OpenAI", age: "6d ago" },
  { id: "c8", severity: "Medium", title: "Checkpointer interface deprecated", type: "Deprecation", vendor: "LangChain / LangGraph", age: "1w ago" },
  { id: "c9", severity: "Medium", title: "New region for serverless indexes", type: "Feature", vendor: "Pinecone", age: "2w ago" },
];
