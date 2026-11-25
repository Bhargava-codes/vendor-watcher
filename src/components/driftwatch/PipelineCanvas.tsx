import { useState } from "react";
import {
  AudioLines,
  BrainCircuit,
  Database,
  GitBranch,
  Layers3,
  MemoryStick,
  Mic2,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  COMPONENT_LAYERS,
  COMPONENT_LAYER_LABEL,
  COMPONENT_LAYER_SHORT_LABEL,
  LAYER_VENDOR_OPTIONS,
  TRACKING_MODE_LABEL,
  VENDOR_LABEL,
  addPipelineLayer,
  removePipelineComponent,
  updatePipelineComponent,
  type ComponentLayer,
  type DeveloperPipeline,
  type ModelTrackingMode,
  type PipelineComponent,
  type VendorId,
} from "@/lib/pipeline-data";
import { cn } from "@/lib/utils";

const LAYER_ICON: Record<ComponentLayer, LucideIcon> = {
  stt: Mic2,
  llm: BrainCircuit,
  tts: AudioLines,
  speech_model: Sparkles,
  telephony: Phone,
  tools: Wrench,
  memory: MemoryStick,
  embeddings: Database,
  guardrails: ShieldCheck,
  orchestration: GitBranch,
};

function ComponentCard({
  component,
  index,
  selected,
  canRemove,
  onSelect,
  onChange,
  onRemove,
}: {
  component: PipelineComponent;
  index: number;
  selected: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onChange: (patch: Parameters<typeof updatePipelineComponent>[2]) => void;
  onRemove: () => void;
}) {
  const Icon = LAYER_ICON[component.layer];
  const vendors = LAYER_VENDOR_OPTIONS[component.layer];

  return (
    <article
      className={cn(
        "w-full min-w-0 flex-1 rounded-xl border bg-surface transition-colors",
        selected ? "border-brand shadow-[0_0_0_2px_var(--brand-soft)]" : "border-line",
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Inspect ${COMPONENT_LAYER_LABEL[component.layer]} example`}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              selected ? "bg-brand text-primary-foreground" : "bg-brand-soft text-brand",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {String(index + 1).padStart(2, "0")} · {COMPONENT_LAYER_SHORT_LABEL[component.layer]}
            </span>
            <span className="block truncate text-xs font-semibold text-ink">
              {COMPONENT_LAYER_LABEL[component.layer]}
            </span>
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${COMPONENT_LAYER_LABEL[component.layer]}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-p0-soft hover:text-p0"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            Provider
          </span>
          <select
            value={component.vendorId}
            onChange={(event) =>
              onChange({
                vendorId: event.target.value as VendorId,
                modelId: null,
                modelTracking: "not_sure",
              })
            }
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-xs font-medium text-ink outline-none focus:border-brand"
          >
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {VENDOR_LABEL[vendor]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            Model / resource ID
          </span>
          <input
            value={component.modelId ?? ""}
            suppressHydrationWarning
            onChange={(event) => onChange({ modelId: event.target.value || null })}
            placeholder={component.layer === "tts" ? "model or voice ID" : "e.g. nova-3"}
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 font-mono text-[11px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            Tracking
          </span>
          <select
            value={component.modelTracking}
            onChange={(event) =>
              onChange({ modelTracking: event.target.value as ModelTrackingMode })
            }
            className="h-8 w-full rounded-md border border-line bg-canvas px-2 text-xs text-ink outline-none focus:border-brand"
          >
            {Object.entries(TRACKING_MODE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {component.modelTracking === "alias" && (
          <p className="rounded-md bg-p1-soft px-2 py-1.5 text-[10px] leading-relaxed text-p1">
            Aliases can repoint without a deploy. DriftWatch treats them as higher drift risk.
          </p>
        )}
      </div>
    </article>
  );
}

export function PipelineCanvas({
  pipeline,
  selectedComponentId,
  onSelectComponent,
  onChange,
}: {
  pipeline: DeveloperPipeline;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onChange: (pipeline: DeveloperPipeline) => void;
}) {
  const [adding, setAdding] = useState(false);
  const availableLayers = COMPONENT_LAYERS.filter(
    (layer) => !pipeline.components.some((component) => component.layer === layer),
  );
  const [layerToAdd, setLayerToAdd] = useState<ComponentLayer>(availableLayers[0] ?? "tools");
  const vendorCount = new Set(pipeline.components.map((component) => component.vendorId)).size;
  const aliasCount = pipeline.components.filter(
    (component) => component.modelTracking === "alias",
  ).length;

  const addLayer = () => {
    const layer = availableLayers.includes(layerToAdd) ? layerToAdd : availableLayers[0];
    if (!layer) return;
    const id = `custom-${layer}-${Date.now()}`;
    onChange(addPipelineLayer(pipeline, layer, id));
    onSelectComponent(id);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {pipeline.components.map((component, index) => (
          <div key={component.id} className="contents">
            {index > 0 && (
              <div className="flex shrink-0 items-center justify-center text-ink-faint lg:w-5">
                <ArrowDown className="size-4 lg:hidden" />
                <ArrowRight className="hidden size-4 lg:block" />
              </div>
            )}
            <ComponentCard
              component={component}
              index={index}
              selected={selectedComponentId === component.id}
              canRemove={pipeline.components.length > 1}
              onSelect={() => onSelectComponent(component.id)}
              onChange={(patch) =>
                onChange(updatePipelineComponent(pipeline, component.id, patch))
              }
              onRemove={() => {
                const next = removePipelineComponent(pipeline, component.id);
                onChange(next);
                if (selectedComponentId === component.id) {
                  onSelectComponent(next.components[0]?.id ?? "");
                }
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
        {adding && availableLayers.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Component layer to add"
              value={availableLayers.includes(layerToAdd) ? layerToAdd : (availableLayers[0] ?? "")}
              onChange={(event) => setLayerToAdd(event.target.value as ComponentLayer)}
              className="h-9 rounded-lg border border-line bg-surface px-3 text-xs text-ink outline-none focus:border-brand"
            >
              {availableLayers.map((layer) => (
                <option key={layer} value={layer}>
                  {COMPONENT_LAYER_LABEL[layer]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addLayer}
              className="h-9 rounded-lg bg-brand px-3 text-xs font-medium text-primary-foreground hover:bg-brand-hover"
            >
              Add component
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-9 rounded-lg px-3 text-xs font-medium text-ink-dim hover:bg-canvas"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={availableLayers.length === 0}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-xs font-medium text-ink-dim transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Add another layer
          </button>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint sm:ml-auto">
          <span className="inline-flex items-center gap-1.5">
            <Layers3 className="size-3.5" /> {pipeline.components.length} components
          </span>
          <span>{vendorCount} providers</span>
          <span className={aliasCount > 0 ? "text-p1" : ""}>{aliasCount} dynamic aliases</span>
        </div>
      </div>
    </div>
  );
}
