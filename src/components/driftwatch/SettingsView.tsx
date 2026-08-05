import { useState } from "react";
import { SectionCard } from "./shared";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  hint: string;
  options: string[];
  initial: string;
};

const ROWS: Row[] = [
  {
    id: "uncertain",
    title: "Surface changes we're unsure about",
    hint: "When we can't tell whether you use something, we'd rather show you than hide it.",
    options: ["On", "Off"],
    initial: "On",
  },
  {
    id: "pricing",
    title: "Flag price moves at or above",
    hint: "Smaller moves stay out of your inbox.",
    options: ["10%", "25%", "50%"],
    initial: "25%",
  },
  {
    id: "routing",
    title: "Send uncertain changes to",
    hint: "Anything with low confidence gets a person in the loop.",
    options: ["Human review", "Normal routing"],
    initial: "Human review",
  },
  {
    id: "fetch",
    title: "How we read vendor pages",
    hint: "Firecrawl handles pages that need a real browser or block plain requests.",
    options: ["Firecrawl", "Direct fetch"],
    initial: "Firecrawl",
  },
];

export function SettingsView() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ROWS.map((r) => [r.id, r.initial])),
  );

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-ink-dim">
        Tune how aggressive we are about what reaches you.
      </p>

      <SectionCard className="divide-y divide-line">
        {ROWS.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{row.title}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{row.hint}</p>
            </div>
            <div className="flex shrink-0 rounded-lg border border-line bg-canvas p-0.5">
              {row.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [row.id]: opt }))}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    values[row.id] === opt
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-dim hover:text-ink",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
