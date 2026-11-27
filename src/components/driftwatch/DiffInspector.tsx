import { useState } from "react";
import { Check, Copy, FileDiff, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import {
  COMPONENT_LAYER_LABEL,
  VENDOR_LABEL,
  sampleDiffForLayer,
  type PipelineComponent,
} from "@/lib/pipeline-data";
import { PriorityPill } from "./shared";

export function DiffInspector({ component }: { component: PipelineComponent }) {
  const [copied, setCopied] = useState(false);
  const diff = sampleDiffForLayer(component.layer);
  const rawDiff = [
    `--- before/${component.layer}`,
    `+++ after/${component.layer}`,
    "@@ vendor dependency @@",
    `- ${diff.before}`,
    `+ ${diff.after}`,
  ].join("\n");

  const copyDiff = async () => {
    try {
      await navigator.clipboard.writeText(rawDiff);
      setCopied(true);
      toast.success("Raw sample diff copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-terminal-line bg-terminal text-terminal-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-terminal-line px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-terminal-muted/60" />
          <span className="size-2 rounded-full bg-terminal-muted/40" />
          <span className="size-2 rounded-full bg-terminal-muted/25" />
        </div>
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-terminal-muted">
          <TerminalSquare className="size-3.5 shrink-0" />
          <span className="truncate">mooring inspect --layer {component.layer}</span>
        </div>
        <span className="ml-auto rounded-full border border-terminal-line px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-terminal-muted">
          Synthetic preview
        </span>
      </div>

      <div className="border-b border-terminal-line px-4 py-3 font-mono text-[10px] leading-5 sm:px-5">
        <p className="break-all text-terminal-muted">
          <span className="text-terminal-foreground">TARGET</span> synthetic://{component.vendorId}/changelog
        </p>
        <p className="break-all text-terminal-muted">
          <span className="text-terminal-foreground">STACK</span> {VENDOR_LABEL[component.vendorId]}
          {component.modelId ? ` / ${component.modelId}` : " / model not specified"}
        </p>
        <p className="text-terminal-muted">
          <span className="text-terminal-foreground">MODE</span> example only · no network request
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FileDiff className="size-4 text-terminal-muted" />
          <h3 className="text-xs font-semibold">{diff.title}</h3>
          <PriorityPill priority={diff.priority} />
        </div>
        <div className="overflow-x-auto rounded-lg border border-terminal-line font-mono text-[10px] leading-6 sm:text-[11px]">
          <div className="min-w-max px-3 py-2 text-terminal-muted">@@ vendor dependency @@</div>
          <div className="min-w-max bg-diff-remove-soft px-3 py-1 text-diff-remove">
            <span className="mr-3 select-none">-</span>{diff.before}
          </div>
          <div className="min-w-max bg-diff-add-soft px-3 py-1 text-diff-add">
            <span className="mr-3 select-none">+</span>{diff.after}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-terminal-line bg-terminal-panel p-3.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-diff-add">
            Impact analysis · example
          </p>
          <p className="mt-2 text-xs leading-5 text-terminal-foreground">{diff.impact}</p>
          <p className="mt-2 text-xs leading-5 text-terminal-muted">
            <span className="font-medium text-terminal-foreground">Suggested action: </span>
            {diff.action}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-terminal-line px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <p className="text-[10px] leading-4 text-terminal-muted">{diff.disclosure}</p>
        <button
          type="button"
          onClick={() => void copyDiff()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border border-terminal-line px-2.5 text-[11px] font-medium text-terminal-foreground transition-colors hover:bg-terminal-panel sm:ml-auto sm:h-8"
        >
          {copied ? <Check className="size-3.5 text-diff-add" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy raw diff"}
        </button>
      </div>
      <span className="sr-only">Selected layer: {COMPONENT_LAYER_LABEL[component.layer]}</span>
    </div>
  );
}
