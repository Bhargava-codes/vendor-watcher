import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Capture", copy: "Reading vendor pages and new changelog entries" },
  { title: "Compare", copy: "Comparing it to what we saw last time" },
  { title: "Analyze", copy: "Separating real edits from noise" },
  { title: "Classify", copy: "Working out what each change does" },
  { title: "Prioritize", copy: "Checking it against what you use" },
  { title: "Route", copy: "Sending each change to the right team" },
];

const STEP_MS = 1500;

export function RunWatchOverlay({
  open,
  serverDone,
  summary,
  onClose,
}: {
  open: boolean;
  serverDone: boolean;
  summary: string | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(STEPS.length);
      return;
    }
    if (step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [open, step]);

  const complete = step >= STEPS.length && serverDone;

  useEffect(() => {
    if (!open || !complete) return;
    const t = setTimeout(onClose, 1100);
    return () => clearTimeout(t);
  }, [open, complete, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm px-4">
      <div
        role="dialog"
        aria-label="Running watch"
        className="dw-rise w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-ink">Checking your vendor pages</h2>
        <p className="mt-1 text-sm text-ink-faint">This takes a few seconds.</p>

        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <li
                key={s.title}
                className={cn(
                  "flex items-center gap-3 transition-opacity",
                  !isDone && !isActive && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    isDone
                      ? "border-ok bg-ok text-white"
                      : isActive
                        ? "border-brand text-brand"
                        : "border-line text-ink-faint",
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5" />
                  ) : isActive ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span className="text-[10px] tabular-nums">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{s.title}</span>
                  <span className="block text-xs text-ink-faint">{s.copy}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 border-t border-line pt-4 text-sm">
          {complete ? (
            <p className="font-medium text-ok">{summary ?? "All done."}</p>
          ) : (
            <p className="text-ink-faint">
              {step >= STEPS.length ? "Almost there — finishing the analysis…" : "Working…"}
            </p>

          )}
        </div>
      </div>
    </div>
  );
}
