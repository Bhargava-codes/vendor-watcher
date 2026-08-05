import { X } from "lucide-react";
import { toast } from "sonner";
import {
  PRIORITY_LABEL,
  ROUTE_ACTION,
  ROUTE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_VALUE,
  TYPE_LABEL,
  label,
  type Change,
} from "@/lib/drift-data";
import { PriorityPill, Tag, roleOf, vendorLabel, formatDate } from "./shared";

function whyThisPriority(change: Change) {
  if (change.priority === "noise") {
    return "Nothing of substance changed — wording only, so we filtered it out.";
  }
  const parts: string[] = [];
  parts.push(
    change.severity?.criticality === "on-path"
      ? `${vendorLabel(change.vendor)} sits on the live call path`
      : change.severity?.criticality === "degrading"
        ? `${vendorLabel(change.vendor)} affects quality but not availability`
        : `${vendorLabel(change.vendor)} sits off the call path`,
  );
  parts.push(
    change.uses_this === true
      ? "and this touches something you actually use"
      : change.uses_this === "unknown"
        ? "and we could not confirm whether you use it, so we surfaced it anyway"
        : "and you do not use the affected piece today",
  );
  if (change.severity?.failure_mode === "silent_regression") {
    parts.push("— it fails silently, which is why it outranks a loud error");
  } else if (change.days_to_impact != null && change.deadline_date) {
    parts.push(`— ${change.days_to_impact} days until the cutoff`);
  }
  return `${parts.join(" ")}.`;
}

export function ChangeDrawer({ change, onClose }: { change: Change | null; onClose: () => void }) {
  if (!change) return null;

  const isNoise = change.priority === "noise";
  const action = label(ROUTE_ACTION, change.routed_to);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25"
      />
      <div className="dw-slide-in relative flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityPill priority={change.priority} />
              <Tag>{label(TYPE_LABEL, change.change_type)}</Tag>
              <Tag>
                {vendorLabel(change.vendor)} · {roleOf(change.vendor)}
              </Tag>
            </div>
            <h2 className="mt-2 text-base font-semibold text-ink">{change.section}</h2>
            <p className="text-xs text-ink-faint">
              {PRIORITY_LABEL[change.priority]}
              {change.deadline_date ? ` · Due ${formatDate(change.deadline_date)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-ink-dim hover:bg-canvas"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              The change
            </h3>
            <div className="mt-2 overflow-hidden rounded-lg border border-line font-mono text-xs">
              <p className="border-b border-line bg-p0-soft px-3 py-2 text-p0">
                <span className="mr-2 select-none opacity-60">−</span>
                {change.before || "(nothing there before)"}
              </p>
              <p className="bg-brand-soft/50 px-3 py-2 text-ok">
                <span className="mr-2 select-none opacity-60">+</span>
                {change.after || "(removed)"}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Why it matters
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink">{change.interpretation}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Why this priority
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{whyThisPriority(change)}</p>
          </section>

          {change.severity ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                How we scored it
              </h3>
              <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
                {(
                  [
                    "criticality",
                    "certainty",
                    "time_to_impact",
                    "action_cost",
                    "failure_mode",
                    "confidence",
                  ] as const
                ).map((key) => (
                  <div key={key} className="bg-surface px-3 py-2.5">
                    <dt className="text-[11px] text-ink-faint">{SEVERITY_LABEL[key]}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink">
                      {label(SEVERITY_VALUE, change.severity?.[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <p className="rounded-lg border border-dashed border-line bg-canvas px-3 py-3 text-sm text-ink-dim">
              We stopped before scoring this one — nothing of substance changed.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => {
              toast.success(isNoise ? "Dismissed" : `Sent to ${label(ROUTE_LABEL, change.routed_to)}`);
              onClose();
            }}
            className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {isNoise ? "Dismiss" : action}
          </button>
          <button
            type="button"
            onClick={() => toast("Thanks — we logged that this call was wrong.")}
            className="inline-flex h-9 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink-dim hover:bg-canvas"
          >
            Mark as wrong
          </button>
        </div>
      </div>
    </div>
  );
}
