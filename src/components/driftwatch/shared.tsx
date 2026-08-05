import type { Priority } from "@/lib/drift-data";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<Priority, string> = {
  P0: "bg-p0-soft text-p0 ring-p0/20",
  P1: "bg-p1-soft text-p1 ring-p1/20",
  P2: "bg-p2-soft text-p2 ring-p2/20",
  P3: "bg-p3-soft text-p3 ring-p3/20",
  noise: "bg-noise-soft text-noise ring-noise/20",
};

export function PriorityPill({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        PRIORITY_STYLE[priority],
        className,
      )}
    >
      {priority === "noise" ? "Noise" : priority}
    </span>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-p3-soft px-2 py-0.5 text-xs font-medium text-ink-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface", className)}>{children}</div>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "Never checked";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never checked";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return formatDate(value);
}

export const STATUS_LABEL: Record<string, string> = {
  baseline: "First check stored",
  no_change: "No change",
  changed: "Change found",
  error: "Could not read page",
  content_removed: "Page removed",
};

export function vendorLabel(vendor: string) {
  const map: Record<string, string> = {
    deepgram: "Deepgram",
    openai: "OpenAI",
    elevenlabs: "ElevenLabs",
    krisp: "Krisp",
  };
  return map[vendor.toLowerCase()] ?? vendor;
}

export function roleOf(vendor: string) {
  const map: Record<string, string> = {
    deepgram: "STT",
    openai: "LLM",
    elevenlabs: "TTS",
    krisp: "Noise",
  };
  return map[vendor.toLowerCase()] ?? "";
}
