import { Camera, Brain, Send } from "lucide-react";
import { SectionCard } from "./shared";

const STEPS = [
  {
    icon: Camera,
    title: "Capture",
    body: "We read each vendor page on a schedule, strip out the navigation and boilerplate, and remember exactly what it said. On the next visit we compare the two and keep only what actually moved.",
  },
  {
    icon: Brain,
    title: "Reason",
    body: "Every real change is checked against what you use — the endpoints, models and versions on your call path. We work out whether it breaks now, breaks later, quietly changes behaviour, or costs more, and how much of your product it touches.",
  },
  {
    icon: Send,
    title: "Route",
    body: "Each change lands with the team that can act on it, carrying its deadline. Cosmetic edits are dropped before they reach anyone, so your inbox only holds things worth a decision.",
  },
];

export function HowItWorksView() {
  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-ink-dim">
        Your vendors ship changes constantly. Almost none of them matter to you. Here's how we
        tell the difference.
      </p>

      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <SectionCard key={step.title} className="flex gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <step.icon className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Step {i + 1}
              </p>
              <h2 className="text-base font-semibold text-ink">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{step.body}</p>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
