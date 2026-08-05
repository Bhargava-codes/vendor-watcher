export const ROLE_OPTIONS = ["STT", "LLM", "TTS", "noise-cancel"] as const;
export type WatchRole = (typeof ROLE_OPTIONS)[number];

export const ROLE_LABEL: Record<string, string> = {
  STT: "Speech to text",
  LLM: "Language model",
  TTS: "Text to speech",
  "noise-cancel": "Noise cancellation",
};

export function inferProvider(url: string): string {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .replace(/\.(com|ai|io|dev|co|net|org)(\.[a-z]{2})?$/, "");
    const first = host.split(".").pop() ?? host;
    const known: Record<string, string> = {
      deepgram: "Deepgram",
      openai: "OpenAI",
      platform: "OpenAI",
      elevenlabs: "ElevenLabs",
      krisp: "Krisp",
      anthropic: "Anthropic",
      assemblyai: "AssemblyAI",
      cartesia: "Cartesia",
    };
    return known[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    return "Unknown";
  }
}

export function positionForRole(role: string): string {
  return role === "noise-cancel" ? "degrading" : "on-path";
}
