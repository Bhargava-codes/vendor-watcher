import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { TrailEntry } from "@/lib/agent-trail";
import { AgentTrail } from "./AgentTrailView";

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
  useEffect(() => {
    if (!open || !serverDone) return;
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
  }, [open, serverDone, onClose]);

  if (!open) return null;

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
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-faint">
            {!serverDone && <Loader2 className="size-3.5 animate-spin text-brand" />}
            {serverDone
              ? (summary ?? "All done.")
              : current
                ? `${current.action} — ${current.url ?? current.detail}`
                : "Starting…"}
          </p>
        </div>

        <div className="mt-4 border-t border-line">
          <AgentTrail entries={entries} compact />
        </div>

        <div className="border-t border-line px-6 py-3 text-xs text-ink-faint">
          {serverDone ? (
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-brand hover:underline"
            >
              Close
            </button>
          ) : (
            "Live — this is the agent's actual progress, not a placeholder."
          )}
        </div>
      </div>
    </div>
  );
}
