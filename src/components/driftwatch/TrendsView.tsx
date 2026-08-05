import { useMemo } from "react";
import { PRIORITY_ORDER, type Change, type Priority } from "@/lib/drift-data";
import { PriorityPill, SectionCard, formatDate, vendorLabel } from "./shared";

const BAR_COLOR: Record<Priority, string> = {
  P0: "bg-p0",
  P1: "bg-p1",
  P2: "bg-p2",
  P3: "bg-p3",
  noise: "bg-noise",
};

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-ink-dim">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-p3-soft">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${max === 0 ? 0 : (value / max) * 100}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs tabular-nums text-ink-dim">{value}</span>
    </div>
  );
}

export function TrendsView({ changes }: { changes: Change[] }) {
  const byPriority = useMemo(() => {
    return PRIORITY_ORDER.map((p) => ({
      key: p,
      count: changes.filter((c) => c.priority === p).length,
    }));
  }, [changes]);

  const byVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of changes) map.set(c.vendor, (map.get(c.vendor) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [changes]);

  const deadlines = changes
    .filter((c) => c.deadline_date)
    .sort((a, b) => (a.deadline_date ?? "").localeCompare(b.deadline_date ?? ""));

  const maxPriority = Math.max(1, ...byPriority.map((b) => b.count));
  const maxVendor = Math.max(1, ...byVendor.map(([, n]) => n));

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-ink-dim">
        A read on where your vendor risk is concentrating. Illustrative for now — it fills out as
        runs accumulate.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard className="p-5">
          <h2 className="text-sm font-semibold text-ink">Changes by priority</h2>
          <div className="mt-4 space-y-3">
            {byPriority.map((row) => (
              <BarRow
                key={row.key}
                label={row.key === "noise" ? "Noise" : row.key}
                value={row.count}
                max={maxPriority}
                color={BAR_COLOR[row.key]}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-sm font-semibold text-ink">Changes by vendor</h2>
          <div className="mt-4 space-y-3">
            {byVendor.map(([vendor, count]) => (
              <BarRow
                key={vendor}
                label={vendorLabel(vendor)}
                value={count}
                max={maxVendor}
                color="bg-brand"
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-5">
        <h2 className="text-sm font-semibold text-ink">Open deadlines</h2>
        {deadlines.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Nothing on a clock right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {deadlines.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 py-2.5">
                <PriorityPill priority={c.priority} />
                <span className="text-sm text-ink">
                  {vendorLabel(c.vendor)} — {c.after}
                </span>
                <span className="ml-auto text-sm tabular-nums text-ink-dim">
                  {formatDate(c.deadline_date)}
                  {c.days_to_impact != null ? ` · ${c.days_to_impact} days` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
