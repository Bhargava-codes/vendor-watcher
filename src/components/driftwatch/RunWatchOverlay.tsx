import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { TrailEntry } from "@/lib/agent-trail";
import { AgentTrail } from "./AgentTrailView";
import { cn } from "@/lib/utils";

type StepState = "pending" | "active" | "done";

const STEPS = [
  {
    id: "plan",
    label: "Reading your watchlist",
    hint: "Picking a strategy per vendor page",
    actions: ["Plan"],
  },
  {
    id: "fetch",
    label: "Fetching vendor pages",
    hint: "Opening each changelog and entry",
    actions: ["Visit", "Discover", "Reset"],
  },
  {
    id: "extract",
    label: "Extracting readable content",
    hint: "Stripping nav, chrome and markup",
    actions: ["Extract"],
  },
  {
    id: "compare",
    label: "Comparing against last snapshot",
    hint: "Content hash first, then a line diff",
    actions: ["Hash", "Compare", "Baseline", "Stop"],
  },
  {
    id: "classify",
    label: "Scoring impact on your call path",
    hint: "Only real diffs reach the model",
    actions: ["Classify"],
  },
  {
    id: "route",
    label: "Routing changes to owners",
    hint: "Priority, owner and inbox row",
    actions: ["Route", "Report"],
  },
] as const;

function stepStates(entries: TrailEntry[], serverDone: boolean): StepState[] {
  if (serverDone) return STEPS.map(() => "done");

  let highest = -1;
  for (const e of entries) {
    const idx = STEPS.findIndex((s) => (s.actions as readonly string[]).includes(e.action));
    if (idx > highest) highest = idx;
  }
  if (highest < 0) highest = 0;

  return STEPS.map((_, i) => (i < highest ? "done" : i === highest ? "active" : "pending"));
}

export function RunWatchOverlay({
  open,
  entries,
  serverDone,
  summary,
  onClose,
}: {
  open: boolean;
  entries: TrailEntry[];
  serverDone: boolean;
  summary: string | null;
  onClose: () => void;
}) {
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (!open || !serverDone) return;
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
  }, [open, serverDone, onClose]);

  useEffect(() => {
    if (!open) setShowLog(false);
  }, [open]);

  if (!open) return null;

  const states = stepStates(entries, serverDone);
  const current = entries[entries.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Running watch"
        aria-live="polite"
        className="dw-rise w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="px-6 pt-6">
          <h2 className="text-base font-semibold text-ink">Checking your vendor pages</h2>
          <p className="mt-1 text-sm text-ink-faint">
            {serverDone
              ? (summary ?? "All done.")
              : "Live progress — each step below is the agent's actual work."}
          </p>
        </div>

        <ol className="mt-5 space-y-3 px-6">
          {STEPS.map((step, i) => {
            const state = states[i];
            return (
              <li key={step.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line">
                  {state === "done" ? (
                    <Check className="size-3 text-ok" />
                  ) : state === "active" ? (
                    <Loader2 className="size-3 animate-spin text-brand" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-line" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      state === "pending" ? "text-ink-faint" : "font-medium text-ink",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {state === "active" && current
                      ? (current.url ?? current.detail)
                      : step.hint}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 border-t border-line">
          <button
            type="button"
            onClick={() => setShowLog((s) => !s)}
            className="flex w-full items-center justify-between px-6 py-3 text-xs text-ink-faint hover:text-ink"
          >
            <span>{showLog ? "Hide" : "Show"} agent log ({entries.length})</span>
            <ChevronDown className={cn("size-3.5 transition-transform", showLog && "rotate-180")} />
          </button>
          {showLog && (
            <div className="border-t border-line">
              <AgentTrail entries={entries} compact />
            </div>
          )}
        </div>

        {serverDone && (
          <div className="border-t border-line px-6 py-3 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-brand hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
