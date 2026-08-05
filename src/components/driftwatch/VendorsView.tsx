import { Pin } from "lucide-react";
import { USAGE_MANIFEST } from "@/lib/drift-data";
import { ROLE_LABEL } from "@/lib/watch-utils";
import { SectionCard, Tag, vendorLabel } from "./shared";
import { cn } from "@/lib/utils";

const IMPACT: Record<string, string> = {
  deepgram: "If this breaks, calls stop being transcribed.",
  openai: "If this breaks, the agent stops responding.",
  elevenlabs: "If this breaks, the agent loses its voice.",
  krisp: "If this breaks, audio gets noisier — calls still connect.",
};

export function VendorsView() {
  const entries = Object.entries(USAGE_MANIFEST);

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-ink-dim">
        What each vendor does for you, and exactly which pieces you depend on. This is what we
        check every change against.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([key, vendor]) => (
          <SectionCard key={key} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{vendorLabel(key)}</h2>
                <p className="text-xs text-ink-faint">
                  {ROLE_LABEL[vendor.role] ?? vendor.role}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                  vendor.dependency_position === "on-path"
                    ? "bg-p0-soft text-p0 ring-p0/20"
                    : "bg-p1-soft text-p1 ring-p1/20",
                )}
              >
                {vendor.dependency_position === "on-path"
                  ? "On the call path"
                  : "Quality only"}
              </span>
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-faint">
              What we use
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vendor.uses.length === 0 ? (
                <span className="text-sm text-ink-faint">Nothing pinned yet</span>
              ) : (
                vendor.uses.map((item) => (
                  <Tag key={item} className="font-mono">
                    {vendor.pinned.includes(item) && <Pin className="mr-1 size-3 text-p1" />}
                    {item}
                  </Tag>
                ))
              )}
            </div>

            <p className="mt-4 text-sm text-ink-dim">{IMPACT[key]}</p>
          </SectionCard>
        ))}
      </div>

      <p className="text-xs text-ink-faint">
        Pinned items are versions you have locked in code — a change to those always reaches you.
      </p>
    </div>
  );
}
