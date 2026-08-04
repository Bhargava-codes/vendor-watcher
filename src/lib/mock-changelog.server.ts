export const MOCK_VERSIONS = {
  1: `# Deepgram Changelog

## Models
nova-2 (acoustic model v2.1)

## Changelog
/v1/listen

## Pricing
gpt-4o input $2.50 / 1M tokens

## Voice Agent API

## Hero
Fast, reliable noise cancellation.`,
  2: `# Deepgram Changelog

## Models
nova-2 now defaults to updated acoustic model

## Changelog
/v1/listen deprecated; migrate to /v2 by 2026-10-15

## Pricing
gpt-4o input $3.25 / 1M tokens

## Voice Agent API
Added gemini-3.5-flash as a managed LLM

## Hero
Reliable, fast noise cancellation.`,
};

export function getMockContent(version: number): string {
  return MOCK_VERSIONS[version as keyof typeof MOCK_VERSIONS] ?? MOCK_VERSIONS[1];
}
