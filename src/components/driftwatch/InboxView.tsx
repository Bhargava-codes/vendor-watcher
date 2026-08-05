import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock, Filter, Layers } from "lucide-react";
import {
  PRIORITY_ORDER,
  ROUTE_LABEL,
  TYPE_LABEL,
  label,
  type Change,
  type Priority,
} from "@/lib/drift-data";
import { PriorityPill, SectionCard, formatDate, roleOf, vendorLabel } from "./shared";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | Priority; label: string }[] = [
  { id: "all", label: "All" },
  { id: "P0", label: "P0" },
  { id: "P1", label: "P1" },
  { id: "P2", label: "P2" },
  { id: "noise", label: "Noise" },
];

function Kpi({
  label: title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Layers;
  tone?: "p0" | "p1" | "default";
}) {
  return (
    <SectionCard className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-dim">
        <Icon
          className={cn(
            "size-4",
            tone === "p0" ? "text-p0" : tone === "p1" ? "text-p1" : "text-ink-faint",
          )}
        />
        {title}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "p0" ? "text-p0" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-faint">{hint}</p>
    </SectionCard>
  );
}

export function InboxView({
  changes,
  query,
  onOpen,
  liveError,
}: {
  changes: Change[];
  query: string;
  onOpen: (change: Change) => void;
  liveError: string | null;
}) {
  const [filter, setFilter] = useState<"all" | Priority>("all");

  const sorted = useMemo(() => {
    return [...changes].sort(
      (a, b) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) ||
        (b.blast_radius ?? 0) - (a.blast_radius ?? 0),
    );
  }, [changes]);

  const noise = sorted.filter((c) => c.priority === "noise");
  const signal = sorted.filter((c) => c.priority !== "noise");

  const visible = useMemo(() => {
    const base = filter === "all" ? signal : sorted.filter((c) => c.priority === filter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) =>
      [c.vendor, c.section, c.after, c.before, c.interpretation]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [filter, signal, sorted, query]);

  const p0 = signal.filter((c) => c.priority === "P0").length;
  const deadlines = signal.filter((c) => c.deadline_date).length;
  const nextDeadline = signal
    .filter((c) => c.deadline_date)
    .map((c) => c.deadline_date as string)
    .sort()[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Needs action now"
          value={p0}
          hint="On the live call path"
          icon={AlertTriangle}
          tone="p0"
        />
        <Kpi
          label="Changes surfaced"
          value={signal.length}
          hint="Across 4 vendors"
          icon={Layers}
        />
        <Kpi
          label="Deadlines tracked"
          value={deadlines}
          hint={nextDeadline ? `Next ${formatDate(nextDeadline)}` : "None pending"}
          icon={Clock}
          tone="p1"
        />
        <Kpi
          label="Filtered as noise"
          value={noise.length}
          hint="Never reached your inbox"
          icon={Filter}
        />
      </div>

      {liveError && (
        <div className="rounded-xl border border-p0/30 bg-p0-soft px-4 py-3 text-sm text-p0">
          {liveError}
        </div>
      )}

      {noise.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-ink-dim">
          <Filter className="size-4 text-ink-faint" />
          <span>
            We quietly dropped{" "}
            <strong className="font-semibold text-ink">{noise.length}</strong> cosmetic edit
            {noise.length === 1 ? "" : "s"} so they never reached you.
          </span>
          <button
            type="button"
            onClick={() => setFilter("noise")}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            See what we filtered <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {visible.length} change{visible.length === 1 ? "" : "s"}
          </p>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "bg-brand text-white"
                    : "bg-p3-soft text-ink-dim hover:bg-line",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">
            Nothing here right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-2 font-semibold">Priority</th>
                  <th className="px-4 py-2 font-semibold">Vendor</th>
                  <th className="px-4 py-2 font-semibold">What changed</th>
                  <th className="px-4 py-2 font-semibold">Goes to</th>
                  <th className="px-4 py-2 font-semibold">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((change, i) => (
                  <tr
                    key={`${change.vendor}-${change.section}-${i}`}
                    onClick={() => onOpen(change)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onOpen(change);
                    }}
                    className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-canvas focus:bg-canvas focus:outline-none"
                  >
                    <td className="px-4 py-3 align-top">
                      <PriorityPill priority={change.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <p className="font-medium text-ink">{vendorLabel(change.vendor)}</p>
                      <p className="text-xs text-ink-faint">{roleOf(change.vendor)}</p>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top">
                      <p className="text-ink">{change.after || change.before || change.section}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {label(TYPE_LABEL, change.change_type)} · {change.section}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-ink-dim">
                      {label(ROUTE_LABEL, change.routed_to)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-ink-dim tabular-nums">
                      {change.deadline_date ? formatDate(change.deadline_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
