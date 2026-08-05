import { AlertTriangle, Check, Info, Loader2, TriangleAlert } from "lucide-react";
import type { TrailEntry, TrailStatus } from "@/lib/agent-trail";
import { SectionCard } from "./shared";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: TrailStatus }) {
  const base = "size-3.5";
  if (status === "running") return <Loader2 className={cn(base, "animate-spin text-brand")} />;
  if (status === "error") return <AlertTriangle className={cn(base, "text-p0")} />;
  if (status === "warn") return <TriangleAlert className={cn(base, "text-p1")} />;
  if (status === "info") return <Info className={cn(base, "text-ink-faint")} />;
  return <Check className={cn(base, "text-ok")} />;
}

function time(at: string) {
  return new Date(at).toISOString().slice(11, 19);
}

export function AgentTrail({ entries, compact }: { entries: TrailEntry[]; compact?: boolean }) {
  if (entries.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-ink-faint">
        No actions yet — hit “Run watch” and every step the agent takes will be logged here.
      </p>
    );
  }

  return (
    <ol className={cn("divide-y divide-line/70", compact && "max-h-64 overflow-y-auto")}>
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 px-4 py-2.5">
          <span className="mt-1 shrink-0">
            <StatusIcon status={e.status} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-ink">{e.action}</span>
              <span className="text-ink-dim">{e.detail}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">Why: {e.reason}</p>
            {e.url && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">{e.url}</p>
            )}
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">
            {time(e.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AgentTrailView({ entries }: { entries: TrailEntry[] }) {
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-ink-dim">
        Every action the agent took on the last run, in order, with the reason behind it — which
        page it visited, what it extracted, where it stopped early, and what it sent to the
        classifier.
      </p>
      <SectionCard>
        <div className="border-b border-line px-4 py-3 text-sm font-medium text-ink">
          {entries.length} action{entries.length === 1 ? "" : "s"}
        </div>
        <AgentTrail entries={entries} />
      </SectionCard>
    </div>
  );
}
