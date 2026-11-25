import { describe, expect, test } from "bun:test";
import {
  COMPONENT_LAYERS,
  PIPELINE_PRESETS,
  SAMPLE_DIFFS,
  addPipelineLayer,
  pipelineFromPreset,
  removePipelineComponent,
  sampleDiffForLayer,
  updatePipelineComponent,
} from "./pipeline-data.ts";

function presetById(id) {
  const preset = PIPELINE_PRESETS.find((item) => item.id === id);
  if (!preset) throw new Error(`Missing pipeline preset: ${id}`);
  return preset;
}

describe("pipeline starter data", () => {
  test("presets have unique IDs and at least one component", () => {
    const ids = PIPELINE_PRESETS.map((preset) => preset.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(PIPELINE_PRESETS.every((preset) => preset.components.length > 0)).toBe(true);
  });

  test("official-docs presets retain their documented provider and model IDs", () => {
    const pipecat = presetById("pipecat-voice");
    const vapi = presetById("vapi-provider-config");
    const retell = presetById("retell-managed-voice");

    expect(
      pipecat.components.some(
        (component) =>
          component.layer === "stt" &&
          component.vendorId === "deepgram" &&
          component.modelId === "nova-3",
      ),
    ).toBe(true);
    expect(
      vapi.components.some(
        (component) =>
          component.layer === "llm" &&
          component.vendorId === "openai" &&
          component.modelId === "gpt-4.1",
      ),
    ).toBe(true);
    expect(
      retell.components.some(
        (component) =>
          component.layer === "speech_model" &&
          component.vendorId === "retell" &&
          component.modelId === "gpt-live-1",
      ),
    ).toBe(true);
  });

  test("sample diffs are always disclosed as synthetic examples", () => {
    expect(SAMPLE_DIFFS.length).toBeGreaterThan(0);
    expect(SAMPLE_DIFFS.every((diff) => diff.illustrativeOnly)).toBe(true);
    expect(SAMPLE_DIFFS.every((diff) => diff.disclosure.includes("Synthetic example"))).toBe(
      true,
    );
  });

  test("every supported component layer has a synthetic example", () => {
    for (const layer of COMPONENT_LAYERS) {
      expect(sampleDiffForLayer(layer).layer).toBe(layer);
      expect(sampleDiffForLayer(layer).illustrativeOnly).toBe(true);
    }
  });

  test("loading a preset creates an independently editable pipeline", () => {
    const pipeline = pipelineFromPreset("pipecat-voice");
    const component = pipeline.components[0];
    expect(component).toBeDefined();

    const updated = updatePipelineComponent(pipeline, component.id, { modelId: "nova-2" });

    expect(updated.components[0].modelId).toBe("nova-2");
    expect(pipeline.components[0].modelId).toBe("nova-3");
    expect(PIPELINE_PRESETS[0].components[0].modelId).toBe("nova-3");
  });

  test("adding and removing a layer preserves existing components", () => {
    const pipeline = pipelineFromPreset("agentic-tool-use");
    const withMemory = addPipelineLayer(pipeline, "guardrails", "test-guardrails");

    expect(withMemory.components).toHaveLength(pipeline.components.length + 1);
    expect(withMemory.components.at(-1).vendorId).toBe("openai");

    const removed = removePipelineComponent(withMemory, "test-guardrails");
    expect(removed.components.map((component) => component.id)).toEqual(
      pipeline.components.map((component) => component.id),
    );
  });
});