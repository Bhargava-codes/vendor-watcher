import { useState } from "react";
import type { Change, Priority } from "@/lib/drift-data";

const PRIORITY_COLOR: Record<Priority, string> = {
  P0: "var(--p0)",
  P1: "var(--p1)",
  P2: "var(--p2)",
  P3: "var(--p3)",
  noise: "var(--noise)",
};

export function priorityColor(p: Priority) {
  return PRIORITY_COLOR[p] ?? PRIORITY_COLOR.noise;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-[3px] font-mono text-[10px] tracking-wide text-[var(--ink-dim)]">
      <span className="text-[var(--ink-faint)]">{label}</span> {value}
    </span>
  );
}

export function ChangeCard({
  change,
  index,
  onFlag,
  flagged,
}: {
  change: Change;
  index: number;
  onFlag: (index: number) => void;
  flagged: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color = priorityColor(change.priority);
  const isNoise = change.priority === "noise";

  return (
    <article
      className="drift-rise relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]"
      style={{ animationDelay: `${index * 70}ms`, opacity: isNoise ? 0.55 : 1 }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: color }} />
      <div className="flex flex-col gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className="rounded px-2 py-[3px] font-mono text-[11px] font-bold tracking-widest"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {change.priority}
          </span>
          <span className="font-display text-[15px] font-medium text-[var(--ink)]">
            {change.vendor}
          </span>
          <span className="font-mono text-[11px] text-[var(--ink-dim)]">{change.change_type}</span>
          <span className="font-mono text-[11px] text-[var(--ink-faint)]">· {change.section}</span>
          <span className="ml-auto font-mono text-[11px] text-[var(--beacon)]">
            → {change.routed_to}
          </span>
        </div>

        <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] font-mono text-[12px] leading-relaxed">
          <div className="border-b border-[var(--line)] px-3 py-2 text-[var(--p0)]">
            <span className="mr-2 text-[var(--ink-faint)]">−</span>
            {change.before || <span className="text-[var(--ink-faint)]">(nothing)</span>}
          </div>
          <div className="px-3 py-2 text-[var(--ok)]">
            <span className="mr-2 text-[var(--ink-faint)]">+</span>
            {change.after || <span className="text-[var(--ink-faint)]">(removed)</span>}
          </div>
        </div>

        <p className="text-[13.5px] leading-relaxed text-[var(--ink)]">{change.interpretation}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {change.severity && (
            <>
              <Chip label="crit" value={change.severity.criticality} />
              <Chip label="cert" value={change.severity.certainty} />
              <Chip label="impact" value={change.severity.time_to_impact} />
              <Chip label="cost" value={change.severity.action_cost} />
              <Chip label="fail" value={change.severity.failure_mode} />
              <Chip label="conf" value={change.severity.confidence} />
            </>
          )}
          <Chip label="uses" value={String(change.uses_this)} />
          {change.deadline_date && (
            <span
              className="rounded px-2 py-[3px] font-mono text-[10px] tracking-wide"
              style={{ backgroundColor: `${color}22`, color }}
            >
              deadline {change.deadline_date}
              {typeof change.days_to_impact === "number" ? ` · ${change.days_to_impact}d` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              onFlag(index);
            }}
            className="rounded border border-[var(--line)] px-2 py-1 font-mono text-[10px] text-[var(--ink-faint)] transition-colors hover:border-[var(--p1)] hover:text-[var(--p1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)]"
            aria-pressed={flagged || open}
          >
            {flagged ? "flagged for re-classify" : "mark as wrong / re-classify"}
          </button>
        </div>
      </div>
    </article>
  );
}
