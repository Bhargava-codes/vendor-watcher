import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  ExternalLink,
  FileDiff,
  FlaskConical,
  ListFilter,
  ReceiptText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PIPELINE_PRESETS,
  VENDOR_LABEL,
  pipelineFromPreset,
  type DeveloperPipeline,
} from "@/lib/pipeline-data";
import { ROUTE_LABEL, TYPE_LABEL } from "@/lib/drift-data";
import type { PublicChangeHighlightsResult } from "@/lib/public-changes.functions";
import { PipelineCanvas } from "./PipelineCanvas";
import { DiffInspector } from "./DiffInspector";
import { MooringLogo } from "./MooringLogo";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const LANDING_PRESET_IDS = [
  "rag-agent",
  "agentic-tool-use",
  "multi-agent-workflow",
  "pipecat-voice",
] as const;

const VENDORS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Mistral",
  "Cohere",
  "Voyage",
  "Pinecone",
  "Weaviate",
  "Qdrant",
  "LangGraph",
  "CrewAI",
  "E2B",
  "Supabase",
  "Deepgram",
  "ElevenLabs",
  "+ more",
];

const FAQS = [
  {
    question: "What is a reliability agent?",
    answer:
      "It watches the third-party dependencies your agent relies on, identifies changes that affect your exact setup, and routes the fix to the right owner. It sits outside your codebase and your application monitoring.",
  },
  {
    question: "What exactly do you watch?",
    answer:
      "Vendor changelogs, dated release entries, model and endpoint documentation, deprecations, pricing, and usage limits. Each alert keeps the source link and before/after evidence.",
  },
  {
    question: "How often does it check?",
    answer:
      "In the current beta, you trigger checks from the monitoring console. Automatic polling schedules are part of the next backend phase; the website does not pretend they are already running.",
  },
  {
    question: "Where do alerts go?",
    answer:
      "Today, every classified change includes a recommended owner in the console. Email, chat, and ticket delivery are the next product phase.",
  },
  {
    question: "What does it cost?",
    answer: "The beta is free to explore and no credit card is required. Production plan limits have not been set yet.",
  },
  {
    question: "Why should I trust an AI classifier?",
    answer:
      "You do not have to trust a summary blindly. Mooring keeps the exact source evidence beside the classification, exposes uncertainty, and leaves the final action with your team.",
  },
  {
    question: "What happens to my stack details?",
    answer:
      "The interactive builder on this page stays in your current browser session. The planned workspace setup stores vendor and product configuration only—not your customer code or traffic.",
  },
];

const COMPARISON_ROWS = [
  ["Your model was quietly swapped for a newer one", "Flagged, with the exact change", "Only if someone posts about it", "No", "Only after answers start changing"],
  ["A feature or endpoint you use is being retired", "Flagged, with the deadline", "Buried in a long update post", "Only when you upgrade", "Only once requests start failing"],
  ["Prices or usage limits changed", "Sent to whoever owns the budget", "Sometimes announced", "No", "Shows your bill, not their price list"],
  ["Does this change actually affect me?", "Yes, ranked for your exact setup", "You work it out", "No", "No"],
  ["How reliable is my AI stack right now?", "One score, updated with every change", "No way to tell", "Only your code's packages", "Your app's health, not your vendors'"],
  ["How much do I have to read?", "Only what affects you", "Everything", "Every version update", "Every alert"],
];

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-brand">
        {number} · {eyebrow}
      </p>
      <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-[30px] sm:leading-tight">
        {title}
      </h2>
      {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-dim">{description}</p>}
    </div>
  );
}

function capturePriority(priority: string) {
  if (priority === "P0") return { label: "Critical", className: "bg-p0-soft text-p0" };
  if (priority === "P1") return { label: "High", className: "bg-p3-soft text-ink-dim" };
  if (priority === "P2") return { label: "Medium", className: "bg-p3-soft text-ink-dim" };
  return { label: "Low", className: "bg-p3-soft text-ink-dim" };
}

function formatCaptureDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function DeveloperLanding({
  onOpenConsole,
  highlights,
}: {
  onOpenConsole: () => void;
  highlights: PublicChangeHighlightsResult;
}) {
  const { user, profile, signOut } = useAuth();
  const [pipeline, setPipeline] = useState<DeveloperPipeline>(() => pipelineFromPreset("rag-agent"));
  const [activePresetId, setActivePresetId] = useState("rag-agent");
  const [selectedComponentId, setSelectedComponentId] = useState(
    pipeline.components[0]?.id ?? null,
  );
  const landingPresets = useMemo(
    () =>
      LANDING_PRESET_IDS.map((id) => {
        const preset = PIPELINE_PRESETS.find((item) => item.id === id);
        if (!preset) throw new Error(`Missing landing preset: ${id}`);
        return preset;
      }),
    [],
  );
  const activePreset = PIPELINE_PRESETS.find((preset) => preset.id === activePresetId);
  const selectedComponent =
    pipeline.components.find((component) => component.id === selectedComponentId) ??
    pipeline.components[0];

  const choosePreset = (presetId: string) => {
    const next = pipelineFromPreset(presetId);
    setPipeline(next);
    setActivePresetId(presetId);
    setSelectedComponentId(next.components[0]?.id ?? null);
  };

  const updatePipeline = (next: DeveloperPipeline) => {
    setPipeline(next);
    setActivePresetId("custom");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="Mooring home">
            <MooringLogo />
          </a>
          <nav className="ml-auto hidden items-center gap-6 text-xs font-medium text-ink-dim md:flex" aria-label="Main navigation">
            <a href="#why-mooring" className="transition-colors hover:text-ink">Why Mooring</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  void signOut().then(
                    () => toast.success("Signed out."),
                    () => toast.error("Could not sign out. Try again."),
                  );
                }}
                className="transition-colors hover:text-ink"
              >
                Sign out
              </button>
            ) : (
              <Link to="/auth" className="transition-colors hover:text-ink">Sign in</Link>
            )}
          </nav>
          {!user && (
            <Link to="/auth" className="ml-auto hidden h-11 items-center rounded-lg px-3 text-xs font-medium text-ink-dim hover:bg-canvas min-[480px]:inline-flex md:hidden">
              Sign in
            </Link>
          )}
          {user && <span className="ml-auto max-w-36 truncate text-xs text-ink-dim md:hidden">{profile?.display_name ?? user.email}</span>}
          {user ? (
            <button
              type="button"
              onClick={onOpenConsole}
              className="ml-auto inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-brand-hover min-[480px]:ml-2 md:ml-0"
            >
              Open console
            </button>
          ) : (
            <Link
              to="/auth"
              className="ml-auto inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-brand-hover min-[480px]:ml-2 md:ml-0"
            >
              Start watching free
            </Link>
          )}
        </div>
      </header>

      <main id="top">
        <section className="bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:px-8">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-dim">
                <span className="size-1.5 rounded-full bg-ok" />
                The reliability agent for your AI stack
              </div>
              <h1 className="max-w-3xl text-[42px] font-semibold leading-[1.04] tracking-[-0.045em] text-ink sm:text-[56px] lg:text-[48px] xl:text-[56px]">
                Ship your agent.
                <span className="block text-brand">We’ll watch the dependencies.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-ink-dim">
                Mooring is the reliability agent for your AI stack. It scores how dependable your models, tools and voice vendors are, and gets every change that could break your agent to the teammate who owns the fix, before your users notice.
              </p>
              <div className="mt-8">
                <Link
                  to="/auth"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
                >
                  Start watching my stack <ArrowRight className="size-4" />
                </Link>
                <p className="mt-3 font-mono text-[10px] text-ink-faint">No credit card required</p>
              </div>
            </div>

            <aside className="rounded-xl border border-line bg-canvas p-4" aria-label="Your current watch plan">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">Your watch plan</p>
                <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[9px] font-medium text-brand">LIVE CONFIG</span>
              </div>
              <div className="space-y-2.5 py-4">
                {pipeline.components.slice(0, 4).map((component) => (
                  <div key={component.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{VENDOR_LABEL[component.vendorId]}</p>
                      <p className="truncate font-mono text-[10px] text-ink-faint">{component.modelId ?? component.layer.replaceAll("_", " ")}</p>
                    </div>
                    <span className={cn(
                      "rounded-md px-2 py-1 font-mono text-[9px] font-medium uppercase",
                      component.modelTracking === "alias" ? "bg-p1-soft text-p1" : "bg-p3-soft text-ink-dim",
                    )}>
                      {component.modelTracking.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-nav px-3.5 py-3 font-mono text-[10px] leading-5 text-nav-muted">
                <p><span className="text-nav-foreground">if</span> content_hash_changed:</p>
                <p className="pl-3">extract_diff()</p>
                <p className="pl-3">score_stack_impact()</p>
                <p><span className="text-nav-foreground">else</span>: <span className="text-diff-add">skip_llm_call()</span></p>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-ink-faint">Every layer feeds your reliability score. Dynamic aliases count as higher risk.</p>
            </aside>
          </div>
        </section>

        <section className="bg-nav px-4 py-7 text-nav-foreground sm:px-6" aria-label="Typical AI stack change volume">
          <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-3">
            <div><p className="text-3xl font-semibold tracking-tight">~50</p><p className="mt-1 max-w-xs text-xs leading-5 text-nav-muted">vendor changelog entries a week across a typical AI stack</p></div>
            <div><p className="text-3xl font-semibold tracking-tight">~90%</p><p className="mt-1 max-w-xs text-xs leading-5 text-nav-muted">are noise: launch posts, typo fixes, features you’ll never touch</p></div>
            <div><p className="text-3xl font-semibold tracking-tight text-p0">~2</p><p className="mt-1 max-w-xs text-xs leading-5 text-nav-muted">break a live call or an agent loop. Those are the ones you hear about from customers.</p></div>
          </div>
        </section>

        <section className="border-b border-line bg-surface px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-ink-dim lg:justify-between">
            <span className="w-full text-center font-mono text-[9px] font-medium uppercase tracking-widest text-ink-faint lg:w-auto lg:text-left">Watch the vendors you actually run</span>
            {VENDORS.map((vendor) => <span key={vendor}>{vendor}</span>)}
          </div>
        </section>

        <section id="why-mooring" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              number="01"
              eyebrow="Map your stack"
              title="Map your AI stack in a minute. See how reliable it really is."
              description="Pick a preset, then set your real providers, model IDs and tracking. A pinned model changes when you deploy. A dynamic alias changes when your vendor decides. We watch the second kind hardest."
            />
            <div className="mt-7 flex gap-2 overflow-x-auto pb-1" aria-label="Starter pipeline presets">
              {landingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => choosePreset(preset.id)}
                  className={cn(
                    "min-h-11 shrink-0 rounded-lg border px-4 py-2 text-left text-xs font-medium transition-colors",
                    activePresetId === preset.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink-dim hover:border-brand/50",
                  )}
                >
                  {preset.label}
                </button>
              ))}
              {activePresetId === "custom" && <span className="flex min-h-11 shrink-0 items-center rounded-lg border border-brand bg-brand-soft px-4 py-2 text-xs font-medium text-brand">Custom stack</span>}
            </div>
            <div className="mt-4 rounded-xl border border-line bg-surface p-3 sm:p-5">
              <PipelineCanvas
                pipeline={pipeline}
                selectedComponentId={selectedComponentId}
                onSelectComponent={setSelectedComponentId}
                onChange={updatePipeline}
              />
            </div>
            {activePreset && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[11px] leading-5 text-ink-dim sm:flex-row sm:items-center">
                <p className="flex-1"><span className="font-medium text-ink">Preset note: </span>{activePreset.setupNote}</p>
                {activePreset.sourceReferences.slice(0, 1).map((source) => (
                  <a key={source} href={source} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-brand hover:underline">
                    Source docs <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-line bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
            <div>
              <SectionHeading number="02" eyebrow="Inspect the signal" title="See the patch, not just the announcement." />
              <p className="mt-4 text-sm leading-6 text-ink-dim">No vague AI summaries. Every alert puts the vendor’s exact before/after next to the verdict, so you can check the call in seconds and get back to shipping.</p>
              <ul className="mt-6 space-y-3 text-sm text-ink-dim">
                <li className="flex items-center gap-2.5"><FileDiff className="size-4 text-brand" /> Exact before and after evidence</li>
                <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 text-brand" /> Priority tied to your actual stack</li>
                <li className="flex items-center gap-2.5"><Braces className="size-4 text-brand" /> Copyable, machine-readable output</li>
                <li className="flex items-center gap-2.5"><Check className="size-4 text-brand" /> An owner and a next step on every alert</li>
              </ul>
            </div>
            {selectedComponent && <DiffInspector component={selectedComponent} />}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              number="03"
              eyebrow="Real captures"
              title="Caught in the wild."
              description="Real changes from live vendor changelogs and release feeds, with the evidence and source entry kept beside the classification."
            />
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {highlights.changes.slice(0, 2).map((change) => {
                const priority = capturePriority(change.priority);
                return (
                  <article key={`${change.id}-${change.section}`} className="flex min-h-56 flex-col rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-ink-faint">{change.vendor} · {formatCaptureDate(change.entryDate)}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", priority.className)}>{priority.label}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-medium leading-6 text-ink">{change.section}</h3>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">{TYPE_LABEL[change.changeType] ?? change.changeType.replaceAll("_", " ")} · {ROUTE_LABEL[change.routedTo] ?? "Review"}</p>
                    <p className="mt-3 flex-1 text-xs leading-5 text-ink-dim">{change.interpretation}</p>
                    <a href={change.entryUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
                      Read the vendor source <ExternalLink className="size-3" />
                    </a>
                  </article>
                );
              })}
              {highlights.changes.length === 0 && (
                <article className="flex min-h-56 flex-col justify-center rounded-xl border border-line bg-surface p-5 md:col-span-2">
                  <p className="text-sm font-medium text-ink">Real captures are not available right now.</p>
                  <p className="mt-2 text-xs leading-5 text-ink-dim">{highlights.error ?? "Run a vendor watch to populate this section with verified source entries."}</p>
                </article>
              )}
              <article className="flex min-h-56 flex-col justify-center rounded-xl border border-dashed border-line bg-surface p-5">
                <ListFilter className="size-8 text-ink-faint" strokeWidth={1.5} />
                <h3 className="mt-4 text-sm font-medium text-ink">Noise, filtered.</h3>
                <p className="mt-2 text-xs leading-5 text-ink-dim">Marketing posts, doc reshuffles and features outside your stack stay out of the action queue.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              number="04"
              eyebrow="For whoever owns uptime"
              title="Right change, right owner. No more “who’s handling this?” threads."
              description="A price hike isn’t an engineering ticket. A latency shift needs an eval run, not a hotfix. We send each change to the team that has to act on it, with a deadline attached."
            />
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Wrench, title: "Engineering ticket", text: "Breaking parameters, renamed config keys, model deprecations." },
                { icon: FlaskConical, title: "QA re-benchmark", text: "Alias repoints, retrieval, latency and output-quality shifts that need an eval run." },
                { icon: ReceiptText, title: "Finance review", text: "Price changes, billing changes and rate-limit cuts." },
                { icon: ShieldCheck, title: "Security audit", text: "Auth, data-handling and compliance changes." },
              ].map((item) => (
                <article key={item.title} className="rounded-xl border border-line bg-canvas p-5">
                  <item.icon className="size-5 text-brand" strokeWidth={1.7} />
                  <h3 className="mt-4 text-sm font-medium text-ink">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-dim">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              number="05"
              eyebrow="What you use today"
              title="Your tools watch your code and your app. Nothing watches your vendors."
              description="Most breakages start outside your codebase, when a provider changes something on their side. Here’s how each way of keeping up compares."
            />
            <div className="mt-7 overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[940px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-canvas">
                    <th className="w-[24%] px-5 py-4 font-medium text-ink">What you’d want to know</th>
                    <th className="w-[18%] px-5 py-4 font-medium text-brand">Mooring<span className="mt-1 block text-[10px] font-normal text-ink-faint">Reads your vendors’ changes for you</span></th>
                    <th className="w-[19%] px-5 py-4 font-medium text-ink">Vendor blogs & Discord<span className="mt-1 block text-[10px] font-normal text-ink-faint">Reading announcements yourself</span></th>
                    <th className="w-[18%] px-5 py-4 font-medium text-ink">Dependency bots<span className="mt-1 block text-[10px] font-normal text-ink-faint">e.g. Dependabot: watch your code’s packages</span></th>
                    <th className="w-[21%] px-5 py-4 font-medium text-ink">Monitoring tools<span className="mt-1 block text-[10px] font-normal text-ink-faint">Watch your app’s answers and errors</span></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-line last:border-0">
                      {row.map((cell, index) => <td key={`${row[0]}-${index}`} className={cn("px-5 py-4 align-top leading-5", index === 0 ? "font-medium text-ink" : "text-ink-dim", index === 1 && "bg-brand-soft/45 text-ink")}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-line bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <SectionHeading number="06" eyebrow="FAQ" title="Frequently asked questions" />
            <Accordion type="single" collapsible className="mt-7 space-y-2">
              {FAQS.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`} className="rounded-lg border border-line bg-canvas px-4">
                  <AccordionTrigger className="min-h-12 py-3 text-left text-sm font-medium text-ink hover:no-underline">{item.question}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm leading-6 text-ink-dim">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-10 rounded-xl border border-line bg-canvas p-6 text-center">
              <h3 className="text-xl font-semibold tracking-tight text-ink">Your vendors keep shipping. Keep your agent dependable.</h3>
              <Link to="/auth" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-primary-foreground hover:bg-brand-hover">
                Start watching my stack <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Mooring. The reliability agent for your AI stack.</p>
          <div className="flex items-center gap-5 font-medium">
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <button type="button" onClick={onOpenConsole} className="hover:text-ink">Live demo</button>
            <Link to="/auth" className="hover:text-ink">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
